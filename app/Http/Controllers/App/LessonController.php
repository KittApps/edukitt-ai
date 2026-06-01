<?php

/**
 * EduKitt AI — Free Edition
 *
 * Copyright (c) 2026 Kitt Apps
 * https://kittapps.com
 *
 * Licensed under the EduKitt AI Free Edition License.
 * See LICENSE in the project root.
 */

namespace App\Http\Controllers\App;

use App\Ai\Agents\LessonContentAgent;
use App\Exceptions\Ai\NoAvailableModelException;
use App\Http\Controllers\App\Concerns\ResolvesAiSelections;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\User;
use App\Services\Ai\AiContentGlobalConfig;
use App\Services\Ai\AiService;
use App\Services\Ai\Generation\AiGenerationDispatcher;
use App\Services\Ai\TaskAssignmentResolver;
use App\Services\CourseCertificateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LessonController extends Controller
{
    use ResolvesAiSelections;

    public function __construct(
        protected AiService $aiService,
        protected CourseCertificateService $certificates,
        protected AiContentGlobalConfig $globalConfig,
        protected TaskAssignmentResolver $assignmentResolver,
        protected AiGenerationDispatcher $generationDispatcher,
    ) {}

    public function show(Request $request, Lesson $lesson)
    {
        $this->authorize('view', $lesson);

        $lesson->load('module.course.modules.lessons');

        // Treat opening any lesson as a "visit" to the parent course so the
        // dashboard's Continue Learning sort tracks real reading activity,
        // not just course-page hits. Direct UPDATE keeps it a single write
        // with no model events firing.
        if ($courseId = $lesson->module?->course_id) {
            Course::whereKey($courseId)->update(['last_accessed_at' => now()]);
        }

        // Direct-navigation fallback: someone hitting the lesson URL from a
        // bookmark / share link / search bypasses the on-demand `generate`
        // endpoint that the in-app navigator uses. Generate inline so the
        // page still renders correctly, accepting the longer wait — the
        // browser is already showing a navigation spinner anyway.
        if (! $lesson->is_generated) {
            try {
                $this->generateContent($lesson, $request->user());
            } catch (NoAvailableModelException $e) {
                return $this->noModelResponse($e);
            }
        }

        return Inertia::render('App/Lessons/Show', [
            'lesson' => $lesson,
            'course' => $lesson->module->course,
        ]);
    }

    /**
     * On-demand "generate this lesson" endpoint used by the in-app
     * navigator (Course Show, lesson next/prev, …) when the user
     * opens a lesson that has not been generated yet.
     *
     * Goes through {@see AiGenerationDispatcher} so the result is
     * shaped the same as every other generation in the app:
     *   - queue toggle OFF — runs the persister inline and returns
     *     `{ redirect: '/app/lessons/{id}' }`
     *   - queue toggle ON  — dispatches a worker job and returns
     *     `{ queued: true, generation_id }`
     *
     * The front-end's `submitAiGeneration` helper hides the
     * difference, so the UX is identical (overlay → navigate) either
     * way.
     *
     * Idempotent: hitting this for an already-generated lesson skips
     * the AI call inside the persister and just returns the redirect.
     */
    public function generate(Request $request, Lesson $lesson)
    {
        $this->authorize('update', $lesson);

        $lesson->loadMissing('module.course');

        /** @var User|null $user */
        $user = Auth::user();
        if ($user === null) {
            abort(401);
        }

        try {
            $assignment = $this->assignmentResolver->resolveForTask('course_lesson', [
                'course' => $lesson->module?->course,
                'is_paid_user' => $this->isPaidUser($user),
            ]);
        } catch (NoAvailableModelException $e) {
            return $this->noModelResponse($e);
        }

        try {
            $result = $this->generationDispatcher->dispatch(
                taskKey: 'course_lesson',
                userId: $user->id,
                assignment: $assignment,
                language: $lesson->module?->course?->language,
                input: [
                    'lesson_id' => $lesson->id,
                ],
            );
        } catch (NoAvailableModelException $e) {
            return $this->noModelResponse($e);
        }

        if ($result->queued) {
            return response()->json([
                'queued' => true,
                'generation_id' => $result->generation->id,
            ], 202);
        }

        return response()->json([
            'redirect' => $result->persisted->redirectUrl,
        ]);
    }

    public function complete(Request $request, Lesson $lesson)
    {
        $this->authorize('update', $lesson);

        // Toggle endpoint: the same request both completes and uncompletes,
        // so we have to know which direction we just moved in to decide
        // whether to revoke the course certificate. Eligibility is never
        // recomputed on the complete path — only the cheap revoke-on-uncomplete
        // UPDATE runs here, per the certificates feature spec.
        $wasCompleted = $lesson->completed_at !== null;

        $lesson->update([
            'completed_at' => $wasCompleted ? null : now(),
        ]);

        if ($wasCompleted) {
            $lesson->loadMissing('module.course');
            $course = $lesson->module?->course;
            if ($course !== null && $request->user() !== null) {
                $this->certificates->revokeIfNeeded($request->user(), $course);
            }
        }

        return back();
    }

    public function regenerate(Request $request, Lesson $lesson)
    {
        $this->authorize('update', $lesson);

        $data = $request->validate([
            'instructions' => 'nullable|string|max:1000',
        ]);

        try {
            $this->generateContent(
                $lesson,
                $request->user(),
                $data['instructions'] ?? null,
            );
        } catch (NoAvailableModelException $e) {
            return $this->noModelResponse($e);
        }

        return redirect()->route('app.lessons.show', $lesson);
    }

    /**
     * Generate the rich-content payload for one lesson, inline.
     *
     * Used by the direct-navigation fallback in {@see show()} and by
     * {@see regenerate()} where we always want to block on completion
     * before redirecting. The on-demand path in {@see generate()} goes
     * through the dispatcher instead so it can respect the queue toggle.
     *
     * @throws NoAvailableModelException when no model is configured at any
     *         fallback level — bubbles up so the caller can return a
     *         generic 503 to the front-end and log the real cause.
     */
    protected function generateContent(
        Lesson $lesson,
        ?User $user = null,
        ?string $regenerateInstructions = null,
    ): void {
        $module = $lesson->module;
        $course = $module->course;

        $assignment = $this->assignmentResolver->resolveForTask('course_lesson', [
            'course' => $course,
            'is_paid_user' => $this->isPaidUser($user),
        ]);

        $agent = new LessonContentAgent(
            courseTitle: $course->title,
            moduleTitle: $module->title,
            lessonSummary: $lesson->summary ?? $lesson->title,
            regenerateInstructions: $regenerateInstructions,
            language: $course->language,
        );

        // Regens share the `course_lesson` task type so they burn the
        // same `max_lessons` quota as a first-time generation — mirrors
        // how `course_outline` outline regens burn `max_courses`. No
        // separate cap, no separate analytics bucket.
        $response = $this->aiService->prompt(
            agent: $agent,
            prompt: "Generate detailed lesson content for: {$lesson->title}",
            taskType: 'course_lesson',
            userId: $user?->id,
            assignment: $assignment,
        );

        $lesson->update([
            'content' => $response['sections'],
            'is_generated' => true,
        ]);

        $this->aiService->linkUsage($response, $lesson);
    }
}

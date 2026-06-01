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

namespace App\Services\Ai\Generation\Persisters;

use App\Ai\Agents\LessonContentAgent;
use App\Models\Lesson;
use App\Services\Ai\AiService;
use App\Services\Ai\Generation\Contracts\Persister;
use App\Services\Ai\Generation\GenerationRequest;
use App\Services\Ai\Generation\PersistedResult;

/**
 * Persister for on-demand lesson content generation.
 *
 * Mirrors the logic previously inlined in
 * {@see \App\Http\Controllers\App\LessonController::generateContent}
 * so the same code runs whether the AI call is invoked synchronously
 * with the HTTP request or via {@see \App\Jobs\Ai\RunGenerationJob}
 * on a worker.
 *
 * Idempotent on `is_generated`: if the lesson has already been
 * populated (e.g. another tab raced ahead while the queue job was
 * still pending), the persister skips the AI call and just hands back
 * the existing redirect URL. Regenerate requests opt back in by
 * passing `regenerate_instructions`.
 *
 * Expected `input` shape:
 *   - lesson_id                int      Required.
 *   - regenerate_instructions  ?string  Optional regenerate prompt addition.
 */
class CourseLessonPersister implements Persister
{
    public function __construct(private readonly AiService $ai) {}

    public function taskKey(): string
    {
        return 'course_lesson';
    }

    public function run(GenerationRequest $request): PersistedResult
    {
        $lessonId = (int) ($request->input['lesson_id'] ?? 0);
        $regenerateInstructions = $request->input['regenerate_instructions'] ?? null;

        /** @var Lesson $lesson */
        $lesson = Lesson::with('module.course')->findOrFail($lessonId);

        if (! $lesson->is_generated || $regenerateInstructions !== null) {
            $module = $lesson->module;
            $course = $module->course;

            $agent = new LessonContentAgent(
                courseTitle: $course->title,
                moduleTitle: $module->title,
                lessonSummary: $lesson->summary ?? $lesson->title,
                regenerateInstructions: $regenerateInstructions,
                language: $course->language,
            );

            $response = $this->ai->prompt(
                agent: $agent,
                prompt: "Generate detailed lesson content for: {$lesson->title}",
                taskType: 'course_lesson',
                userId: $request->userId,
                assignment: $request->assignment(),
            );

            $lesson->update([
                'content' => $response['sections'],
                'is_generated' => true,
            ]);

            $this->ai->linkUsage($response, $lesson);
        }

        return PersistedResult::subject(
            $lesson,
            // Path-only — see QuickLearnPersister for why.
            route('app.lessons.show', $lesson, absolute: false),
        );
    }
}

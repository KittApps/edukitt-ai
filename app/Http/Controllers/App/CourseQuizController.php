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

use App\Exceptions\Ai\NoAvailableModelException;
use App\Http\Controllers\App\Concerns\ResolvesAiSelections;
use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Services\Ai\AiContentGlobalConfig;
use App\Services\Ai\Generation\AiGenerationDispatcher;
use App\Services\Ai\TaskAssignmentResolver;
use Illuminate\Http\Request;

/**
 * Generates a module-end quiz for a course module.
 *
 * Reuses the manual quiz pipeline end-to-end: builds a rich "topic" from
 * the course title + module title + lesson summaries, hands it to
 * {@see QuizGenerationService}, and stores a {@see CourseQuiz} pivot row
 * so the module knows which Quiz to render. The actual Quiz row, agent,
 * prompt, schema, attempts, and Show page are all the existing ones —
 * no parallel quiz system, no duplicate code.
 *
 * Model + language come from server-side context: the model is the
 * `quiz_generate` task default (via {@see TaskAssignmentResolver}),
 * the language is inherited from the parent course (captured when
 * the outline was generated). Users don't pick either from this entry
 * point because the module-quiz modal is a one-click action.
 */
class CourseQuizController extends Controller
{
    use ResolvesAiSelections;

    public function __construct(
        protected AiGenerationDispatcher $generationDispatcher,
        protected AiContentGlobalConfig $globalConfig,
        protected TaskAssignmentResolver $assignmentResolver,
    ) {}

    public function generate(Request $request, Module $module)
    {
        $this->authorize('view', $module->course);

        $request->validate([
            'preferences' => 'nullable|array',
            'time_limit' => 'nullable|string',
        ]);

        try {
            $assignment = $this->assignmentResolver->resolveForTask('quiz_generate', [
                'is_paid_user' => $this->isPaidUser($request->user()),
            ]);

            // course_quiz persister synthesises the teaching-rich
            // topic from the module's lessons and replaces any prior
            // module quiz on success. Same QuizGenerationService is
            // reused under the hood as the manual quiz path.
            $result = $this->generationDispatcher->dispatch(
                taskKey: 'course_quiz',
                userId: $request->user()->id,
                assignment: $assignment,
                language: null, // resolved by the persister from $module->course
                input: [
                    'module_id' => $module->id,
                    'preferences' => $request->input('preferences', []),
                    'time_limit' => $request->input('time_limit'),
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
            'quiz' => $result->persisted->subject,
            'redirect' => $result->persisted->redirectUrl,
        ]);
    }
}

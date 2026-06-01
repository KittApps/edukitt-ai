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

use App\Models\CourseQuiz;
use App\Models\Module;
use App\Models\Quiz;
use App\Services\Ai\Generation\Contracts\Persister;
use App\Services\Ai\Generation\GenerationRequest;
use App\Services\Ai\Generation\PersistedResult;
use App\Services\QuizGenerationService;

/**
 * Persister for the per-module course quiz.
 *
 * Same QuizGenerationService pipeline as the manual quiz wizard, but
 * the "topic" is synthesised from the module's lessons (mirrors the
 * logic in {@see \App\Http\Controllers\App\CourseQuizController}).
 * After the Quiz row is created we wire it to the module via a
 * {@see CourseQuiz} pivot, replacing any prior module quiz so each
 * module owns at most one.
 *
 * Uses its own task_key (`course_quiz`) so the persister registry
 * can disambiguate from the manual quiz path — both rely on the
 * `quiz_generate` AI task assignment though, since the underlying
 * AI call is identical.
 *
 * Expected `input` shape:
 *   - module_id    int      Required.
 *   - preferences  array    User preferences map.
 *   - time_limit   ?string  Optional time limit string.
 */
class CourseQuizPersister implements Persister
{
    public function __construct(private readonly QuizGenerationService $quizGeneration) {}

    public function taskKey(): string
    {
        return 'course_quiz';
    }

    public function run(GenerationRequest $request): PersistedResult
    {
        $moduleId = (int) ($request->input['module_id'] ?? 0);

        /** @var Module $module */
        $module = Module::with(['course', 'lessons'])->findOrFail($moduleId);

        $quiz = $this->quizGeneration->generate(
            topic: $this->buildTopic($module),
            preferences: (array) ($request->input['preferences'] ?? []),
            timeLimit: $request->input['time_limit'] ?? null,
            userId: $request->userId,
            assignment: $request->assignment(),
            language: $module->course->language,
        );

        $previousQuizId = $module->courseQuiz?->quiz_id;
        $module->courseQuiz?->delete();

        CourseQuiz::create([
            'module_id' => $module->id,
            'quiz_id' => $quiz->id,
        ]);

        if ($previousQuizId) {
            Quiz::find($previousQuizId)?->delete();
        }

        return PersistedResult::subject(
            $quiz,
            // Path-only URL — see QuickLearnPersister for why.
            route('app.quizzes.show', $quiz, absolute: false),
        );
    }

    /**
     * Synthesize a teaching-rich topic string the QuizAgent can read
     * verbatim. Mirrors the helper in CourseQuizController so the
     * generated questions actually cover the module's material.
     */
    private function buildTopic(Module $module): string
    {
        $lines = [
            "Course: {$module->course->title}",
            "Module: {$module->title}",
        ];

        if ($module->description) {
            $lines[] = "Module overview: {$module->description}";
        }

        $lines[] = '';
        $lines[] = 'Lessons covered in this module:';

        foreach ($module->lessons as $i => $lesson) {
            $num = $i + 1;
            $lines[] = "{$num}. {$lesson->title}";
            if ($lesson->summary) {
                $lines[] = "   Summary: {$lesson->summary}";
            }
        }

        $lines[] = '';
        $lines[] = 'Generate questions that test understanding of the lesson summaries above. Cover the breadth of the module, not just one lesson.';

        return implode("\n", $lines);
    }
}

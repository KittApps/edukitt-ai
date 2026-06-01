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

namespace App\Services;

use App\Ai\Agents\QuizAgent;
use App\Http\Controllers\App\CourseQuizController;
use App\Http\Controllers\App\QuizController;
use App\Models\AiContentTaskAssignment;
use App\Models\Quiz;
use App\Services\Ai\AiService;

/**
 * One place to take "topic + preferences + time limit + acting user"
 * and produce a persisted {@see Quiz}. Used by both the manual quiz
 * wizard ({@see QuizController::generate}) and
 * the per-module course quiz endpoint
 * ({@see CourseQuizController::generate}), so
 * neither has to know how the QuizAgent is built or how the response is
 * shaped into a Quiz row.
 */
class QuizGenerationService
{
    public function __construct(
        private readonly AiService $ai,
    ) {}

    /**
     * @param  array<string, string>  $preferences
     * @param  ?AiContentTaskAssignment  $assignment  Pre-resolved by the caller
     *         via {@see \App\Services\Ai\TaskAssignmentResolver}. When null we
     *         let {@see AiService::prompt} fall back to the task default.
     * @param  ?string  $language  Display name (e.g. "English") for the
     *         `{language}` placeholder. Inherited from the parent course for
     *         module quizzes, picked from the wizard for manual quizzes.
     */
    public function generate(
        string $topic,
        array $preferences,
        ?string $timeLimit,
        int $userId,
        ?AiContentTaskAssignment $assignment = null,
        ?string $language = null,
    ): Quiz {
        // Fold time_limit into preferences so the JSON column is the single
        // source of truth for all user-selected knobs.
        if ($timeLimit !== null && $timeLimit !== '') {
            $preferences['time_limit'] = $timeLimit;
        }

        $agent = new QuizAgent(
            topic: $topic,
            preferences: $preferences,
            language: $language,
        );

        $response = $this->ai->prompt(
            agent: $agent,
            prompt: "Create a quiz about: {$topic}",
            taskType: QuizAgent::TASK_TYPE,
            userId: $userId,
            assignment: $assignment,
        );

        $questions = $this->normalizeQuestions($response['questions'] ?? []);

        $quiz = Quiz::create([
            'user_id' => $userId,
            'title' => $response['title'] ?? 'Untitled Quiz',
            'description' => $response['description'] ?? null,
            'topic' => $topic,
            'question_count' => count($questions),
            'preferences' => $preferences,
            'language' => $language,
            'ai_model_name' => $assignment?->model?->name,
            'questions' => $questions,
            'is_generated' => true,
            'status' => 'active',
        ]);

        $this->ai->linkUsage($response, $quiz);

        return $quiz;
    }

    /**
     * Force-normalize each question so the frontend can trust the shape.
     *
     * @param  array<int, array<string, mixed>>  $questions
     * @return array<int, array<string, mixed>>
     */
    private function normalizeQuestions(array $questions): array
    {
        return array_values(array_map(function (array $q) {
            $type = $q['type'] ?? 'multiple-choice';
            $options = $q['options'] ?? [];

            if ($type === 'true-false' && empty($options)) {
                $options = ['True', 'False'];
            }

            return [
                'question' => (string) ($q['question'] ?? ''),
                'type' => (string) $type,
                'options' => array_values(array_map('strval', is_array($options) ? $options : [])),
                'correct_answer' => (string) ($q['correct_answer'] ?? ''),
                'explanation' => (string) ($q['explanation'] ?? ''),
            ];
        }, $questions));
    }
}

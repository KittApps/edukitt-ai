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

use App\Services\Ai\Generation\Contracts\Persister;
use App\Services\Ai\Generation\GenerationRequest;
use App\Services\Ai\Generation\PersistedResult;
use App\Services\QuizGenerationService;

/**
 * Persister for the manual Quiz wizard.
 *
 * Delegates to {@see QuizGenerationService} which already knows how
 * to build the agent, run the prompt, normalise the question shape,
 * and persist the {@see \App\Models\Quiz} row. Token usage linking
 * is handled inside the service.
 *
 * Expected `input` shape:
 *   - topic        string   Required.
 *   - preferences  array    User preferences map.
 *   - time_limit   ?string  Optional time limit string (e.g. "5m").
 */
class QuizPersister implements Persister
{
    public function __construct(private readonly QuizGenerationService $quizGeneration) {}

    public function taskKey(): string
    {
        return 'quiz_generate';
    }

    public function run(GenerationRequest $request): PersistedResult
    {
        $quiz = $this->quizGeneration->generate(
            topic: (string) ($request->input['topic'] ?? ''),
            preferences: (array) ($request->input['preferences'] ?? []),
            timeLimit: $request->input['time_limit'] ?? null,
            userId: $request->userId,
            assignment: $request->assignment(),
            language: $request->language,
        );

        return PersistedResult::subject(
            $quiz,
            // Path-only URL — see QuickLearnPersister for why.
            route('app.quizzes.show', $quiz, absolute: false),
        );
    }
}

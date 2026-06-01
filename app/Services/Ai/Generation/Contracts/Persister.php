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

namespace App\Services\Ai\Generation\Contracts;

use App\Services\Ai\Generation\GenerationRequest;
use App\Services\Ai\Generation\PersistedResult;

/**
 * Strategy contract for "given a generation request, run the AI call
 * and persist the resulting subject".
 *
 * One implementation per top-level user-facing flow:
 *
 *   quick_learn    → App\Services\Ai\Generation\Persisters\QuickLearnPersister
 *   course_outline → App\Services\Ai\Generation\Persisters\CourseOutlinePersister
 *   quiz_generate  → App\Services\Ai\Generation\Persisters\QuizPersister
 *   course_quiz    → App\Services\Ai\Generation\Persisters\CourseQuizPersister
 *
 * Implementations are deliberately identical on the sync and queued
 * paths — same code runs whether the AI call happens inline with the
 * HTTP request or on a worker. Throwing is the failure signal; the
 * dispatcher / job translates exceptions into the user-facing
 * surface (sync → noModelResponse / 503, queue → row.markFailed).
 */
interface Persister
{
    /**
     * Logical task key this persister handles. Must match the
     * `AiContentTask.key` value so the resolver and the registry
     * agree on what "quick_learn" / "course_outline" / etc. mean.
     */
    public function taskKey(): string;

    /**
     * Run the AI call and persist the resulting subject. Returns the
     * subject (so the caller can echo it back to the user / link
     * token usage) and the front-end redirect URL.
     */
    public function run(GenerationRequest $request): PersistedResult;
}

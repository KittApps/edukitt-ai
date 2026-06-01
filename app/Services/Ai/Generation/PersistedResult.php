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

namespace App\Services\Ai\Generation;

use Illuminate\Database\Eloquent\Model;

/**
 * Return value from {@see Contracts\Persister::run()}.
 *
 * Two flavours, modelled by the same value object:
 *
 *   1. "Generated a final subject" — Quick Learn, Quiz, Course Quiz.
 *      `subject` is set, `redirectUrl` is the show-route, `payload`
 *      stays empty. The wizard navigates away the moment polling
 *      reports completion.
 *
 *   2. "Produced data for the wizard's next step" — Course Outline.
 *      `subject` is null (no Course is created at this stage),
 *      `redirectUrl` is null, and `payload` carries the AI-built
 *      outline JSON. The wizard's Review step renders it through
 *      the polling endpoint, then the user submits POST /courses
 *      to actually persist a Course.
 *
 * The dispatcher writes whichever set of fields is populated onto
 * the {@see \App\Models\AiGeneration} row; the polling endpoint
 * forwards them verbatim to the wizard.
 */
final class PersistedResult
{
    /**
     * @param  ?Model  $subject  Final persisted subject (Quiz/QuickLearn/…), if any.
     * @param  ?string  $redirectUrl  Front-end navigation target, if the wizard
     *                                should jump away on completion.
     * @param  array<string, mixed>  $payload  Arbitrary JSON the wizard's next
     *                                         step needs (Course Outline data).
     */
    public function __construct(
        public readonly ?Model $subject = null,
        public readonly ?string $redirectUrl = null,
        public readonly array $payload = [],
    ) {}

    /**
     * Subject-shaped result. Use for flows that produce a final model
     * the wizard navigates to (Quick Learn, Quiz, Course Quiz).
     */
    public static function subject(Model $subject, string $redirectUrl): self
    {
        return new self(subject: $subject, redirectUrl: $redirectUrl);
    }

    /**
     * Payload-shaped result. Use for flows whose AI step produces
     * data the wizard still has to confirm before persistence
     * (Course Outline).
     *
     * @param  array<string, mixed>  $payload
     */
    public static function payload(array $payload): self
    {
        return new self(payload: $payload);
    }
}

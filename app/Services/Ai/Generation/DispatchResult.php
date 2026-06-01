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

use App\Models\AiGeneration;

/**
 * Return value from {@see AiGenerationDispatcher::dispatch()}.
 *
 * Two flavours that bottom out at the same controller-response shape:
 *
 *   sync()   — the persister ran inline, we have the final result.
 *              Controller can convert `$persisted->subject` and
 *              `$persisted->redirectUrl` into whatever JSON shape
 *              that endpoint already returns.
 *
 *   queued() — a job was dispatched; we have a polling handle on
 *              `$generation`. Controller returns `{ generation_id,
 *              queued: true }` and lets the front-end poll the
 *              status endpoint until the row reaches a terminal
 *              state.
 *
 * Modelled as a single value object so controllers stop branching
 * on the queue toggle directly — the dispatcher already did.
 */
final class DispatchResult
{
    public function __construct(
        public readonly bool $queued,
        public readonly ?PersistedResult $persisted = null,
        public readonly ?AiGeneration $generation = null,
    ) {}

    public static function sync(PersistedResult $persisted): self
    {
        return new self(queued: false, persisted: $persisted);
    }

    public static function queued(AiGeneration $generation): self
    {
        return new self(queued: true, generation: $generation);
    }
}

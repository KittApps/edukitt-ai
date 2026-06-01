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

namespace App\Services\Localization;

/**
 * Result of one auto-translate batch.
 *
 * The frontend keeps a running tally of these as it loops through
 * batches, so we only ship per-batch numbers + errors here — no
 * cumulative state.
 */
class LocalizationAiBatchResult
{
    /** @var array<int, array{key: string, message: string}> */
    public array $errors = [];

    public int $translated = 0;

    public int $skipped = 0;

    public int $remainingBefore = 0;

    public int $remainingAfter = 0;

    public bool $done = false;

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'translated' => $this->translated,
            'skipped' => $this->skipped,
            'remaining_before' => $this->remainingBefore,
            'remaining_after' => $this->remainingAfter,
            'done' => $this->done,
            'errors' => $this->errors,
        ];
    }
}

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

namespace App\Ai\Tracking\Analytics;

use Carbon\CarbonImmutable;

/**
 * Inclusive date window used by the token usage analytics queries.
 * Bounds are normalised to the start of day so the window snaps to
 * full calendar days regardless of the time-of-day at construction.
 */
final readonly class DateRange
{
    public function __construct(
        public CarbonImmutable $start,
        public CarbonImmutable $end,
    ) {}

    public static function lastDays(int $days): self
    {
        $end = CarbonImmutable::now()->startOfDay();
        return new self($end->subDays($days - 1), $end);
    }

    public function startOfDay(): CarbonImmutable
    {
        return $this->start->startOfDay();
    }

    /** Inclusive end-of-day for between() filters. */
    public function endOfDay(): CarbonImmutable
    {
        return $this->end->endOfDay();
    }

    public function days(): int
    {
        return $this->start->startOfDay()->diffInDays($this->end->startOfDay()) + 1;
    }

    public function cacheKey(string $namespace): string
    {
        return sprintf(
            'ai-tracking:%s:%s:%s',
            $namespace,
            $this->start->toDateString(),
            $this->end->toDateString(),
        );
    }
}

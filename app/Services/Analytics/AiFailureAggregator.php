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

namespace App\Services\Analytics;

use App\Ai\Tracking\Analytics\DateRange;
use App\Models\AiCallFailure;
use App\Models\AiTokenUsage;
use Illuminate\Support\Collection;

/**
 * Powers the "AI Failures" analytics page.
 *
 * Success counts are derived from `ai_token_usages` (one row per
 * fulfilled prompt) rather than from a dedicated success log, so
 * we get the metric for free without adding a row to the hot path.
 * Failure counts and details come from `ai_call_failures`, written
 * only on the final-give-up branch of {@see \App\Services\Ai\AiService::invokeWithRetry()}.
 */
class AiFailureAggregator
{
    /**
     * @return array{
     *   total: int,
     *   successful: int,
     *   failed: int,
     *   failure_rate: float,
     *   failed_last_24h: int,
     * }
     */
    public function summary(DateRange $range): array
    {
        $successful = (int) AiTokenUsage::query()
            ->whereBetween('created_at', [$range->startOfDay(), $range->endOfDay()])
            ->count();

        $failed = (int) AiCallFailure::query()
            ->whereBetween('created_at', [$range->startOfDay(), $range->endOfDay()])
            ->count();

        $total = $successful + $failed;
        $rate = $total > 0 ? round(($failed / $total) * 100, 2) : 0.0;

        // Always a rolling 24h window regardless of the date filter —
        // this is the "is anything on fire right now?" signal admins
        // need at a glance, so it stays anchored to wall-clock time.
        $failedLast24h = (int) AiCallFailure::query()
            ->where('created_at', '>=', now()->subDay())
            ->count();

        return [
            'total' => $total,
            'successful' => $successful,
            'failed' => $failed,
            'failure_rate' => $rate,
            'failed_last_24h' => $failedLast24h,
        ];
    }

    /**
     * Daily breakdown of successful vs failed calls. Always covers
     * every day in the range (zero-filled) so the chart never has gaps.
     *
     * @return array<int, array{date: string, successful: int, failed: int}>
     */
    public function timeseries(DateRange $range): array
    {
        $successByDay = AiTokenUsage::query()
            ->whereBetween('created_at', [$range->startOfDay(), $range->endOfDay()])
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        $failedByDay = AiCallFailure::query()
            ->whereBetween('created_at', [$range->startOfDay(), $range->endOfDay()])
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        $out = [];
        $cursor = $range->startOfDay();
        $end = $range->endOfDay()->startOfDay();
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            $out[] = [
                'date' => $key,
                'successful' => (int) ($successByDay[$key] ?? 0),
                'failed' => (int) ($failedByDay[$key] ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $out;
    }

    /**
     * Latest 25 failure rows (regardless of date range) — the page
     * shows them as the most recent operational signal admins need
     * when triaging provider issues.
     *
     * @return array<int, array{
     *   id: int,
     *   created_at: string,
     *   task_type: string,
     *   provider_slug: ?string,
     *   error_class: ?string,
     *   error_message: ?string,
     *   user: ?array{id: int, name: ?string, email: ?string},
     * }>
     */
    public function latestErrors(int $limit = 25): array
    {
        return AiCallFailure::query()
            ->with(['user:id,name,email'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn (AiCallFailure $row) => [
                'id' => (int) $row->id,
                'created_at' => optional($row->created_at)->toIso8601String() ?? '',
                'task_type' => (string) $row->task_type,
                'provider_slug' => $row->provider_slug,
                'error_class' => $row->error_class,
                'error_message' => $row->error_message,
                'user' => $row->user ? [
                    'id' => (int) $row->user->id,
                    'name' => $row->user->name,
                    'email' => $row->user->email,
                ] : null,
            ])
            ->all();
    }
}

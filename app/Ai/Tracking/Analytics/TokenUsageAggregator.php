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

use App\Http\Controllers\App\SubscriptionController;
use App\Models\AiTokenUsage;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Read-side service powering /admin/analytics/ai-tokens-usage and
 * /admin/analytics/ai-tokens-cost. Every method returns plain
 * Inertia-ready arrays — the frontend formatter / chart libs do the rest.
 *
 * Performance:
 *   - Each method is one indexed aggregation query (SUM/COUNT GROUP BY).
 *   - All reads are wrapped in Cache::remember with a short TTL so a
 *     dashboard refresh doesn't repeatedly hit the DB.
 *   - Cache is invalidated by writes via flushFor() (called from the
 *     listener on every recorded row).
 *
 * The query layer always reads from `ai_token_usages` directly, so we
 * never need a denormalised rollup table for this dataset size. If the
 * table ever exceeds tens of millions of rows, swap any single method
 * for a daily-rollup query without touching callers.
 */
class TokenUsageAggregator
{
    private const CACHE_TTL = 60; // seconds — analytics pages refresh-tolerant

    /**
     * Display labels for known task types. Public so the user-facing
     * Usage chart in {@see SubscriptionController}
     * can reuse the same labels and stay consistent with admin analytics.
     */
    public const TASK_LABELS = [
        'course_outline' => 'Course Outline',
        'course_lesson' => 'Course Lesson',
        'quick_learn' => 'Quick Learn',
        'quiz_generate' => 'Quiz Generation',
        'content_summary' => 'Content Summary',
    ];

    /**
     * @return array{
     *   total_tokens: int, input_tokens: int, output_tokens: int,
     *   generation_count: int, avg_tokens_per_run: int,
     *   total_cost: float, input_cost: float, output_cost: float,
     *   avg_cost_per_run: float
     * }
     */
    public function summary(DateRange $range): array
    {
        return $this->remember($range, 'summary', function () use ($range) {
            $row = $this->baseQuery($range)
                ->selectRaw('
                    COUNT(*)                                                            AS runs,
                    COALESCE(SUM(prompt_tokens
                        + cache_read_input_tokens
                        + cache_write_input_tokens), 0)                                 AS input_tokens,
                    COALESCE(SUM(completion_tokens + reasoning_tokens), 0)              AS output_tokens,
                    COALESCE(SUM(input_cost), 0)                                        AS input_cost,
                    COALESCE(SUM(output_cost), 0)                                       AS output_cost,
                    COALESCE(SUM(total_cost), 0)                                        AS total_cost
                ')
                ->first();

            $runs = (int) ($row->runs ?? 0);
            $inputTokens = (int) ($row->input_tokens ?? 0);
            $outputTokens = (int) ($row->output_tokens ?? 0);
            $totalTokens = $inputTokens + $outputTokens;
            $totalCost = (float) ($row->total_cost ?? 0);

            return [
                'total_tokens' => $totalTokens,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'generation_count' => $runs,
                'avg_tokens_per_run' => $runs > 0 ? (int) round($totalTokens / $runs) : 0,
                'total_cost' => round($totalCost, 4),
                'input_cost' => round((float) ($row->input_cost ?? 0), 4),
                'output_cost' => round((float) ($row->output_cost ?? 0), 4),
                'avg_cost_per_run' => $runs > 0 ? round($totalCost / $runs, 4) : 0.0,
            ];
        });
    }

    /**
     * Daily/weekly buckets of usage and cost for the area/line charts.
     * Buckets are widened automatically for long ranges to keep x-axis readable.
     *
     * @return array<int, array{
     *   date: string,
     *   input: int, output: int,
     *   input_cost: float, output_cost: float
     * }>
     */
    public function timeseries(DateRange $range): array
    {
        return $this->remember($range, 'timeseries', function () use ($range) {
            $totalDays = $range->days();
            $bucketDays = $totalDays > 62 ? 7 : ($totalDays > 31 ? 2 : 1);

            // Pull all daily rows once, then bucket in PHP. Cheaper than
            // multiple bucket-aware queries and works across DB drivers.
            $daily = $this->baseQuery($range)
                ->selectRaw('
                    DATE(created_at) AS day,
                    SUM(prompt_tokens + cache_read_input_tokens + cache_write_input_tokens) AS input_tokens,
                    SUM(completion_tokens + reasoning_tokens) AS output_tokens,
                    SUM(input_cost)  AS input_cost,
                    SUM(output_cost) AS output_cost
                ')
                ->groupBy('day')
                ->orderBy('day')
                ->get()
                ->keyBy(fn ($row) => $row->day);

            $rows = [];
            $cursor = $range->startOfDay();
            $endDay = $range->end->startOfDay();

            while ($cursor->lte($endDay)) {
                $bucketEnd = $cursor->addDays($bucketDays - 1);
                if ($bucketEnd->gt($endDay)) {
                    $bucketEnd = $endDay;
                }

                $sumIn = $sumOut = 0;
                $sumInCost = $sumOutCost = 0.0;
                $day = $cursor;
                while ($day->lte($bucketEnd)) {
                    $key = $day->toDateString();
                    if ($daily->has($key)) {
                        $r = $daily[$key];
                        $sumIn += (int) $r->input_tokens;
                        $sumOut += (int) $r->output_tokens;
                        $sumInCost += (float) $r->input_cost;
                        $sumOutCost += (float) $r->output_cost;
                    }
                    $day = $day->addDay();
                }

                $rows[] = [
                    'date' => $bucketDays === 1
                        ? $cursor->format('M j')
                        : $cursor->format('M j').'–'.$bucketEnd->format('j'),
                    'input' => $sumIn,
                    'output' => $sumOut,
                    'input_cost' => round($sumInCost, 4),
                    'output_cost' => round($sumOutCost, 4),
                ];

                $cursor = $bucketEnd->addDay();
            }

            return $rows;
        });
    }

    /**
     * @return array<int, array{
     *   key: string, label: string,
     *   input: int, output: int,
     *   input_cost: float, output_cost: float, runs: int
     * }>
     */
    public function byContentType(DateRange $range): array
    {
        return $this->remember($range, 'byContentType', function () use ($range) {
            $rows = $this->baseQuery($range)
                ->selectRaw('
                    task_type,
                    COUNT(*) AS runs,
                    SUM(prompt_tokens + cache_read_input_tokens + cache_write_input_tokens) AS input_tokens,
                    SUM(completion_tokens + reasoning_tokens) AS output_tokens,
                    SUM(input_cost)  AS input_cost,
                    SUM(output_cost) AS output_cost
                ')
                ->groupBy('task_type')
                ->orderByRaw('SUM(input_cost) + SUM(output_cost) DESC')
                ->get();

            return $rows->map(fn ($r) => [
                'key' => $r->task_type,
                'label' => self::TASK_LABELS[$r->task_type] ?? $this->humanise($r->task_type),
                'input' => (int) $r->input_tokens,
                'output' => (int) $r->output_tokens,
                'input_cost' => round((float) $r->input_cost, 4),
                'output_cost' => round((float) $r->output_cost, 4),
                'runs' => (int) $r->runs,
            ])->all();
        });
    }

    /**
     * @return array<int, array{
     *   provider: string, model: string,
     *   input: int, output: int,
     *   input_cost: float, output_cost: float, runs: int,
     *   input_rate: ?float, output_rate: ?float
     * }>
     */
    public function byProvider(DateRange $range): array
    {
        return $this->remember($range, 'byProvider', function () use ($range) {
            // Aggregate by snapshot strings (provider_slug, model_id) so rows
            // remain meaningful even if the provider/model is later renamed.
            $rows = $this->baseQuery($range)
                ->selectRaw('
                    provider_slug,
                    model_id,
                    COUNT(*) AS runs,
                    SUM(prompt_tokens + cache_read_input_tokens + cache_write_input_tokens) AS input_tokens,
                    SUM(completion_tokens + reasoning_tokens) AS output_tokens,
                    SUM(input_cost)  AS input_cost,
                    SUM(output_cost) AS output_cost,
                    AVG(input_rate)  AS avg_input_rate,
                    AVG(output_rate) AS avg_output_rate
                ')
                ->groupBy('provider_slug', 'model_id')
                ->orderByRaw('SUM(input_cost) + SUM(output_cost) DESC')
                ->get();

            // Resolve human-readable provider names (and pretty model names) in one batch.
            $providers = DB::table('ai_providers')
                ->pluck('name', 'slug');
            $models = DB::table('ai_provider_models')
                ->select('ai_provider_models.name', 'ai_provider_models.model_id', 'ai_providers.slug')
                ->join('ai_providers', 'ai_providers.id', '=', 'ai_provider_models.ai_provider_id')
                ->get()
                ->keyBy(fn ($m) => $m->slug.'|'.$m->model_id);

            return $rows->map(function ($r) use ($providers, $models) {
                $key = ($r->provider_slug ?? '').'|'.($r->model_id ?? '');
                $modelName = $models[$key]->name ?? $r->model_id ?? 'unknown';

                return [
                    'provider' => $providers[$r->provider_slug] ?? ($r->provider_slug ?? 'unknown'),
                    'model' => $modelName,
                    'input' => (int) $r->input_tokens,
                    'output' => (int) $r->output_tokens,
                    'input_cost' => round((float) $r->input_cost, 4),
                    'output_cost' => round((float) $r->output_cost, 4),
                    'runs' => (int) $r->runs,
                    'input_rate' => $r->avg_input_rate !== null ? round((float) $r->avg_input_rate, 4) : null,
                    'output_rate' => $r->avg_output_rate !== null ? round((float) $r->avg_output_rate, 4) : null,
                ];
            })->all();
        });
    }

    /**
     * @return array<int, array{
     *   user_id: int, name: string, email: string,
     *   tokens: int, cost: float, runs: int
     * }>
     */
    public function topUsers(DateRange $range, int $limit = 10): array
    {
        return $this->remember($range, 'topUsers:'.$limit, function () use ($range, $limit) {
            // Inline the time filter on the qualified column to avoid an
            // ambiguous `created_at` reference once `users` is joined.
            return AiTokenUsage::query()
                ->whereBetween('ai_token_usages.created_at', [$range->startOfDay(), $range->endOfDay()])
                ->whereNotNull('ai_token_usages.user_id')
                ->join('users', 'users.id', '=', 'ai_token_usages.user_id')
                ->select([
                    'users.id as user_id',
                    'users.name as name',
                    'users.email as email',
                    DB::raw('COUNT(*) AS runs'),
                    DB::raw('SUM(prompt_tokens + cache_read_input_tokens + cache_write_input_tokens
                        + completion_tokens + reasoning_tokens) AS tokens'),
                    DB::raw('SUM(total_cost) AS cost'),
                ])
                ->groupBy('users.id', 'users.name', 'users.email')
                ->orderByDesc('tokens')
                ->limit($limit)
                ->get()
                ->map(fn ($r) => [
                    'user_id' => (int) $r->user_id,
                    'name' => (string) $r->name,
                    'email' => (string) $r->email,
                    'tokens' => (int) $r->tokens,
                    'cost' => round((float) $r->cost, 4),
                    'runs' => (int) $r->runs,
                ])
                ->all();
        });
    }

    /**
     * Drop cached aggregations whose window includes the given timestamp.
     * Called from the listener on every write — cheap because we tag each
     * cached entry with its window dates and only flush rolling-window keys
     * any user might be looking at right now.
     *
     * For simplicity (and because aggregation queries are fast on indexed
     * columns), we just clear the entire ai-tracking namespace via the cache
     * tag if supported, or rely on the short TTL otherwise.
     */
    public function flushFor(?CarbonImmutable $writeTime = null): void
    {
        // The default cache store may not support tags; ignore failures and
        // rely on the short TTL as the safety net.
        try {
            if (method_exists(Cache::store(), 'tags')) {
                Cache::tags(['ai-tracking'])->flush();
            }
        } catch (\Throwable) {
            // no-op; TTL will expire stale entries within seconds.
        }
    }

    private function baseQuery(DateRange $range)
    {
        return AiTokenUsage::query()
            ->whereBetween('created_at', [$range->startOfDay(), $range->endOfDay()]);
    }

    /**
     * Wrap a callback in tag-aware caching so flushFor() can wipe the
     * whole ai-tracking namespace when fresh data lands.
     */
    private function remember(DateRange $range, string $bucket, \Closure $callback): array
    {
        $key = $range->cacheKey($bucket);

        try {
            if (method_exists(Cache::store(), 'tags')) {
                return Cache::tags(['ai-tracking'])->remember($key, self::CACHE_TTL, $callback);
            }
        } catch (\Throwable) {
            // fall through to untagged cache
        }

        return Cache::remember($key, self::CACHE_TTL, $callback);
    }

    private function humanise(string $key): string
    {
        return ucwords(str_replace(['_', '-'], ' ', $key));
    }
}

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

namespace App\Http\Controllers\Admin\Analytics;

use App\Ai\Tracking\Analytics\DateRange;
use App\Ai\Tracking\Analytics\TokenUsageAggregator;
use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AiTokensUsageController extends Controller
{
    public function __construct(
        private readonly TokenUsageAggregator $aggregator,
    ) {}

    public function index(Request $request)
    {
        $range = $this->resolveRange($request);

        $summary = $this->aggregator->summary($range);
        $timeseries = $this->aggregator->timeseries($range);
        $byContentType = $this->aggregator->byContentType($range);
        $byProvider = $this->aggregator->byProvider($range);
        $topUsers = $this->aggregator->topUsers($range, limit: 10);

        return Inertia::render('Admin/Analytics/AiTokensUsage', [
            'range' => [
                'start_date' => $range->start->toDateString(),
                'end_date' => $range->end->toDateString(),
            ],
            'summary' => [
                'total_tokens' => $summary['total_tokens'],
                'input_tokens' => $summary['input_tokens'],
                'output_tokens' => $summary['output_tokens'],
                'generation_count' => $summary['generation_count'],
                'avg_tokens_per_run' => $summary['avg_tokens_per_run'],
            ],
            'timeseries' => array_map(
                fn ($row) => [
                    'date' => $row['date'],
                    'input' => $row['input'],
                    'output' => $row['output'],
                ],
                $timeseries,
            ),
            'byContentType' => array_map(
                fn ($row) => [
                    'key' => $row['key'],
                    'label' => $row['label'],
                    'input' => $row['input'],
                    'output' => $row['output'],
                    'runs' => $row['runs'],
                ],
                $byContentType,
            ),
            'byProvider' => array_map(
                fn ($row) => [
                    'provider' => $row['provider'],
                    'model' => $row['model'],
                    'input' => $row['input'],
                    'output' => $row['output'],
                    'runs' => $row['runs'],
                ],
                $byProvider,
            ),
            'topUsers' => array_map(
                fn ($row) => [
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'tokens' => $row['tokens'],
                    'runs' => $row['runs'],
                ],
                $topUsers,
            ),
        ]);
    }

    private function resolveRange(Request $request): DateRange
    {
        $start = $request->string('start_date')->toString();
        $end = $request->string('end_date')->toString();

        try {
            $startDate = $start !== '' ? CarbonImmutable::parse($start) : CarbonImmutable::now()->subDays(6);
            $endDate = $end !== '' ? CarbonImmutable::parse($end) : CarbonImmutable::now();
        } catch (\Throwable) {
            $startDate = CarbonImmutable::now()->subDays(6);
            $endDate = CarbonImmutable::now();
        }

        if ($endDate->lt($startDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        return new DateRange($startDate->startOfDay(), $endDate->startOfDay());
    }
}

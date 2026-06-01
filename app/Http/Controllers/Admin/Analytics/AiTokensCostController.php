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

class AiTokensCostController extends Controller
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

        return Inertia::render('Admin/Analytics/AiTokensCost', [
            'range' => [
                'start_date' => $range->start->toDateString(),
                'end_date' => $range->end->toDateString(),
            ],
            'summary' => [
                'total_cost' => $summary['total_cost'],
                'input_cost' => $summary['input_cost'],
                'output_cost' => $summary['output_cost'],
                'generation_count' => $summary['generation_count'],
                'avg_cost_per_run' => $summary['avg_cost_per_run'],
                'currency' => 'USD',
            ],
            'timeseries' => array_map(
                fn ($row) => [
                    'date' => $row['date'],
                    'input' => $row['input_cost'],
                    'output' => $row['output_cost'],
                ],
                $timeseries,
            ),
            'byContentType' => array_map(
                fn ($row) => [
                    'key' => $row['key'],
                    'label' => $row['label'],
                    'input_cost' => $row['input_cost'],
                    'output_cost' => $row['output_cost'],
                    'runs' => $row['runs'],
                ],
                $byContentType,
            ),
            'byProvider' => array_map(
                fn ($row) => [
                    'provider' => $row['provider'],
                    'model' => $row['model'],
                    'input_cost' => $row['input_cost'],
                    'output_cost' => $row['output_cost'],
                    'runs' => $row['runs'],
                    'input_rate' => $row['input_rate'],
                    'output_rate' => $row['output_rate'],
                ],
                $byProvider,
            ),
            'topUsers' => array_map(
                fn ($row) => [
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'cost' => $row['cost'],
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

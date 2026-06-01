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
use App\Http\Controllers\Controller;
use App\Services\Analytics\RevenueAggregator;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RevenueController extends Controller
{
    public function __construct(
        private readonly RevenueAggregator $aggregator,
    ) {}

    public function index(Request $request)
    {
        $range = $this->resolveRange($request);

        $summary = $this->aggregator->summary($range);
        $timeseries = $this->aggregator->timeseries($range);
        $byPlan = $this->aggregator->byPlan($range);
        $byPackage = $this->aggregator->byPackage($range);

        return Inertia::render('Admin/Analytics/Revenue', [
            'range' => [
                'start_date' => $range->start->toDateString(),
                'end_date' => $range->end->toDateString(),
            ],
            'summary' => $summary,
            'timeseries' => $timeseries,
            'byPlan' => $byPlan,
            'byPackage' => $byPackage,
        ]);
    }

    private function resolveRange(Request $request): DateRange
    {
        $start = $request->string('start_date')->toString();
        $end = $request->string('end_date')->toString();

        try {
            $startDate = $start !== '' ? CarbonImmutable::parse($start) : CarbonImmutable::now()->subDays(29);
            $endDate = $end !== '' ? CarbonImmutable::parse($end) : CarbonImmutable::now();
        } catch (\Throwable) {
            $startDate = CarbonImmutable::now()->subDays(29);
            $endDate = CarbonImmutable::now();
        }

        if ($endDate->lt($startDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        return new DateRange($startDate->startOfDay(), $endDate->startOfDay());
    }
}

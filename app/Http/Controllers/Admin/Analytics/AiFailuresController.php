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
use App\Models\AiCallFailure;
use App\Services\Analytics\AiFailureAggregator;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AiFailuresController extends Controller
{
    public function __construct(
        private readonly AiFailureAggregator $aggregator,
    ) {}

    public function index(Request $request)
    {
        $range = $this->resolveRange($request);

        return Inertia::render('Admin/Analytics/AiFailures', [
            'range' => [
                'start_date' => $range->start->toDateString(),
                'end_date' => $range->end->toDateString(),
            ],
            'summary' => $this->aggregator->summary($range),
            'timeseries' => $this->aggregator->timeseries($range),
            'latestErrors' => $this->aggregator->latestErrors(25),
        ]);
    }

    /**
     * Wipe the entire ai_call_failures log. Used by the "Clear" action
     * on the Latest Errors card after the operator has triaged the
     * incident and wants a clean slate for the next batch. Truncates
     * the whole table (not just the visible 25) so the success/failure
     * timeseries also resets in step with the table.
     */
    public function clearErrors(): RedirectResponse
    {
        $deleted = AiCallFailure::query()->delete();

        return back()->with(
            'success',
            $deleted > 0
                ? "Cleared {$deleted} AI failure record(s)."
                : 'No AI failure records to clear.',
        );
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

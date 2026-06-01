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
use App\Models\CreditPackPurchase;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Collection;
use Laravel\Cashier\Subscription;

/**
 * Aggregates billing revenue (subscriptions + credit pack purchases)
 * for the admin Revenue analytics page.
 *
 * Subscription revenue is attributed to the subscription's `created_at`
 * — there is no invoice ledger yet, so recurring renewals are not part
 * of the picture. The Transactions page uses the same projection.
 */
class RevenueAggregator
{
    /**
     * @return array{
     *   total: float,
     *   subscriptions: float,
     *   credit_packs: float,
     *   transactions: int,
     *   avg_transaction: float,
     *   currency: string,
     * }
     */
    public function summary(DateRange $range): array
    {
        $subs = $this->subscriptionRows($range);
        $packs = $this->creditPackRows($range);

        $subTotal = (float) $subs->sum('amount');
        $packTotal = (float) $packs->sum('amount');
        $total = $subTotal + $packTotal;
        $count = $subs->count() + $packs->count();

        return [
            'total' => round($total, 2),
            'subscriptions' => round($subTotal, 2),
            'credit_packs' => round($packTotal, 2),
            'transactions' => $count,
            'avg_transaction' => $count > 0 ? round($total / $count, 2) : 0.0,
            'currency' => 'USD',
        ];
    }

    /**
     * Daily revenue split by source. The returned array always covers
     * every day in the range (zero-filled).
     *
     * @return array<int, array{date: string, subscriptions: float, credit_packs: float}>
     */
    public function timeseries(DateRange $range): array
    {
        $subs = $this->subscriptionRows($range)
            ->groupBy(fn (array $row) => $row['date'])
            ->map(fn (Collection $rows) => (float) $rows->sum('amount'));

        $packs = $this->creditPackRows($range)
            ->groupBy(fn (array $row) => $row['date'])
            ->map(fn (Collection $rows) => (float) $rows->sum('amount'));

        $out = [];
        $cursor = $range->startOfDay();
        $end = $range->endOfDay()->startOfDay();
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            $out[] = [
                'date' => $key,
                'subscriptions' => round((float) ($subs[$key] ?? 0), 2),
                'credit_packs' => round((float) ($packs[$key] ?? 0), 2),
            ];
            $cursor = $cursor->addDay();
        }

        return $out;
    }

    /**
     * Revenue grouped by subscription plan + cycle (monthly/yearly).
     *
     * @return array<int, array{plan: string, cycle: string, transactions: int, revenue: float}>
     */
    public function byPlan(DateRange $range): array
    {
        $rows = $this->subscriptionRows($range);

        return $rows
            ->groupBy(fn (array $r) => $r['plan_name'].'|'.$r['cycle'])
            ->map(function (Collection $group) {
                $first = $group->first();
                return [
                    'plan' => (string) $first['plan_name'],
                    'cycle' => (string) $first['cycle'],
                    'transactions' => $group->count(),
                    'revenue' => round((float) $group->sum('amount'), 2),
                ];
            })
            ->sortByDesc('revenue')
            ->values()
            ->all();
    }

    /**
     * Revenue grouped by credit pack package.
     *
     * @return array<int, array{package: string, credits: int, transactions: int, revenue: float}>
     */
    public function byPackage(DateRange $range): array
    {
        $rows = $this->creditPackRows($range);

        return $rows
            ->groupBy(fn (array $r) => $r['package_name'])
            ->map(function (Collection $group) {
                $first = $group->first();
                return [
                    'package' => (string) $first['package_name'],
                    'credits' => (int) $group->sum('credits'),
                    'transactions' => $group->count(),
                    'revenue' => round((float) $group->sum('amount'), 2),
                ];
            })
            ->sortByDesc('revenue')
            ->values()
            ->all();
    }

    /**
     * @return Collection<int, array{date: string, amount: float, plan_name: string, cycle: string}>
     */
    private function subscriptionRows(DateRange $range): Collection
    {
        $plans = SubscriptionPlan::query()->get();
        $planByPriceId = $this->buildPlanByPriceId($plans);

        return Subscription::query()
            ->whereBetween('created_at', [$range->startOfDay(), $range->endOfDay()])
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->get()
            ->map(function (Subscription $sub) use ($planByPriceId): ?array {
                $matched = $sub->stripe_price ? ($planByPriceId[$sub->stripe_price] ?? null) : null;
                if ($matched === null) {
                    return null;
                }

                /** @var SubscriptionPlan $plan */
                $plan = $matched['plan'];
                $cycle = $matched['cycle'];
                $amount = (float) ($cycle === 'yearly' ? $plan->yearly_price : $plan->monthly_price);

                return [
                    'date' => optional($sub->created_at)->toDateString() ?? '',
                    'amount' => $amount,
                    'plan_name' => (string) $plan->name,
                    'cycle' => $cycle,
                ];
            })
            ->filter()
            ->values();
    }

    /**
     * @return Collection<int, array{date: string, amount: float, credits: int, package_name: string}>
     */
    private function creditPackRows(DateRange $range): Collection
    {
        return CreditPackPurchase::query()
            ->with('package')
            ->whereBetween('created_at', [$range->startOfDay(), $range->endOfDay()])
            ->where('status', 'completed')
            ->get()
            ->map(fn (CreditPackPurchase $row) => [
                'date' => optional($row->created_at)->toDateString() ?? '',
                'amount' => $row->amountFloat(),
                'credits' => (int) $row->credits,
                'package_name' => $row->package?->name ?? 'Credit pack',
            ])
            ->values();
    }

    /**
     * @param  Collection<int, SubscriptionPlan>  $plans
     * @return array<string, array{plan: SubscriptionPlan, cycle: 'monthly'|'yearly'}>
     */
    private function buildPlanByPriceId(Collection $plans): array
    {
        $map = [];
        foreach ($plans as $plan) {
            if (! empty($plan->stripe_monthly_price_id)) {
                $map[$plan->stripe_monthly_price_id] = ['plan' => $plan, 'cycle' => 'monthly'];
            }
            if (! empty($plan->stripe_yearly_price_id)) {
                $map[$plan->stripe_yearly_price_id] = ['plan' => $plan, 'cycle' => 'yearly'];
            }
        }

        return $map;
    }
}

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

namespace App\Services\Admin;

use App\Ai\Tracking\Analytics\DateRange;
use App\Models\AiTokenUsage;
use App\Models\CreditPackPurchase;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Analytics\RevenueAggregator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Laravel\Cashier\Subscription;

/**
 * Builds the summary payload powering the admin Dashboard.
 *
 * Intentionally lightweight — no caching, no breakdowns. The admin
 * landing page should answer "how is the platform doing today?" at a
 * glance; deeper drill-downs live on the dedicated analytics pages.
 */
class DashboardAggregator
{
    public function __construct(
        private readonly RevenueAggregator $revenue,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $usersTotal = User::query()->count();
        $usersVerified = User::query()->whereNotNull('email_verified_at')->count();
        $newUsers30 = User::query()
            ->where('created_at', '>=', CarbonImmutable::now()->subDays(29)->startOfDay())
            ->count();

        $activeSubscriptions = Subscription::query()
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->count();
        $paidPlans = SubscriptionPlan::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->where('monthly_price', '>', 0)
                    ->orWhere('yearly_price', '>', 0);
            })
            ->count();

        // All-time revenue: use a generous bound so the aggregator
        // doesn't miss historical rows (the model doesn't track when
        // the business started, so we just go back 10 years).
        $allTime = new DateRange(
            CarbonImmutable::now()->subYears(10)->startOfDay(),
            CarbonImmutable::now()->startOfDay(),
        );
        $revenueAllTime = $this->revenue->summary($allTime);

        $since30 = CarbonImmutable::now()->subDays(29)->startOfDay();
        $aiGenerations30 = AiTokenUsage::query()
            ->where('created_at', '>=', $since30)
            ->count();
        $aiTokens30 = (int) AiTokenUsage::query()
            ->where('created_at', '>=', $since30)
            ->sum('prompt_tokens')
            + (int) AiTokenUsage::query()
                ->where('created_at', '>=', $since30)
                ->sum('completion_tokens');

        return [
            'users' => [
                'total' => $usersTotal,
                'verified' => $usersVerified,
                'new_last_30' => $newUsers30,
            ],
            'subscriptions' => [
                'active' => $activeSubscriptions,
                'paid_plans' => $paidPlans,
            ],
            'revenue' => [
                'total' => $revenueAllTime['total'],
                'transactions' => $revenueAllTime['transactions'],
                'currency' => $revenueAllTime['currency'],
            ],
            'ai' => [
                'generations_last_30' => $aiGenerations30,
                'tokens_last_30' => $aiTokens30,
            ],
        ];
    }

    /**
     * Daily count of new user registrations for the last N days,
     * zero-filled so the chart X-axis stays continuous.
     *
     * @return array<int, array{date: string, count: int}>
     */
    public function userRegistrations(int $days = 30): array
    {
        $end = CarbonImmutable::now()->startOfDay();
        $start = $end->subDays($days - 1);

        $rows = User::query()
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', $end->endOfDay())
            ->selectRaw('DATE(created_at) as bucket, COUNT(*) as cnt')
            ->groupBy('bucket')
            ->pluck('cnt', 'bucket');

        $out = [];
        $cursor = $start;
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            $out[] = [
                'date' => $key,
                'count' => (int) ($rows[$key] ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function recentUsers(int $limit = 5): array
    {
        return User::query()
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => $u->avatar ?? null,
                'is_admin' => (bool) $u->is_admin,
                'created_at' => optional($u->created_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * Last N transactions across subscriptions + credit pack purchases.
     * Mirrors the projection used by the Transactions admin page but
     * dramatically simpler — no filters, no pagination, just the most
     * recent paid rows.
     *
     * @return array<int, array<string, mixed>>
     */
    public function recentTransactions(int $limit = 5): array
    {
        $plans = SubscriptionPlan::query()->get();
        $planByPriceId = $this->buildPlanByPriceId($plans);

        $subs = Subscription::query()
            ->with('owner')
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function (Subscription $sub) use ($planByPriceId) {
                $user = $sub->owner;
                if ($user === null) {
                    return null;
                }
                $matched = $sub->stripe_price ? ($planByPriceId[$sub->stripe_price] ?? null) : null;
                $plan = $matched['plan'] ?? null;
                $cycle = $matched['cycle'] ?? null;
                $amount = 0.0;
                $description = 'Subscription';
                if ($plan !== null) {
                    $amount = (float) ($cycle === 'yearly' ? $plan->yearly_price : $plan->monthly_price);
                    $cycleLabel = $cycle === 'yearly' ? 'Yearly' : 'Monthly';
                    $description = "{$plan->name} — {$cycleLabel}";
                }
                return [
                    'id' => 'sub_'.$sub->id,
                    'type' => 'subscription',
                    'description' => $description,
                    'user' => $this->presentUser($user),
                    'amount' => round($amount, 2),
                    'currency' => $plan?->currency ?? 'USD',
                    'created_at' => optional($sub->created_at)->toIso8601String(),
                ];
            })
            ->filter()
            ->values();

        $packs = CreditPackPurchase::query()
            ->with(['user', 'package'])
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function (CreditPackPurchase $row) {
                $user = $row->user;
                if ($user === null) {
                    return null;
                }
                $packageName = $row->package?->name ?? 'Credit pack';
                return [
                    'id' => 'cp_'.$row->id,
                    'type' => 'credit_pack',
                    'description' => "{$packageName} — {$row->credits} credits",
                    'user' => $this->presentUser($user),
                    'amount' => round($row->amountFloat(), 2),
                    'currency' => $row->currency ?: 'USD',
                    'created_at' => optional($row->created_at)->toIso8601String(),
                ];
            })
            ->filter()
            ->values();

        return $subs->concat($packs)
            ->sortByDesc('created_at')
            ->take($limit)
            ->values()
            ->all();
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

    /**
     * @return array{id: int, name: string, email: string, avatar: ?string}
     */
    private function presentUser(User $user): array
    {
        return [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'avatar' => $user->avatar ?? null,
        ];
    }
}

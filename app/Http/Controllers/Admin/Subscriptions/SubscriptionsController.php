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

namespace App\Http\Controllers\Admin\Subscriptions;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Subscription;

/**
 * Admin Subscriptions page.
 *
 * Lists every user currently sitting on a *paid* SubscriptionPlan
 * (free / no-plan users are deliberately excluded — those belong on
 * the Users page). Each row blends the local plan assignment with
 * the matching Cashier `subscriptions` row (when one exists) so the
 * admin sees a unified picture for both Stripe-driven and manually
 * granted plans.
 *
 * Status, started_at, ends_at and last_payment_at all read from the
 * same sources the user-facing pages use:
 *   - status            : SubscriptionService::resolveStatus()
 *   - started_at        : Cashier subscription.created_at, falling
 *                         back to the credit balance period start
 *   - ends_at           : Cashier subscription.ends_at (canceled),
 *                         falling back to the credit balance period
 *                         end (next renewal anchor)
 *   - last_payment_at   : credit balance.last_renewed_at — set when
 *                         the renewal cron grants the next period of
 *                         credits, which lines up with the most
 *                         recent successful invoice on Stripe-driven
 *                         subscriptions.
 *
 * Editing a row deep-links into the Users edit page with
 * `?section=subscription` so the admin lands directly on the
 * Subscription tab they want to manage.
 */
class SubscriptionsController extends Controller
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function index(Request $request): Response
    {
        $q = trim($request->string('q')->toString());
        $plan = $request->string('plan')->toString() ?: 'all';
        $status = $request->string('status')->toString() ?: 'all';
        $term = $request->string('term')->toString() ?: 'all';

        // Paid plans are the universe of this page. We use the same
        // monthly/yearly-price > 0 rule as the Users "paid" stat to
        // stay consistent across surfaces.
        $paidPlanIds = SubscriptionPlan::query()
            ->where(function (Builder $b) {
                $b->where('monthly_price', '>', 0)
                    ->orWhere('yearly_price', '>', 0);
            })
            ->pluck('id');

        $paginator = User::query()
            ->whereIn('subscription_plan_id', $paidPlanIds)
            ->with([
                'subscriptionPlan',
                'creditBalance',
                'subscriptions' => fn ($q) => $q->where('type', SubscriptionService::CASHIER_SUBSCRIPTION_NAME),
            ])
            ->when($q !== '', fn (Builder $b) => $b->where(function (Builder $b) use ($q) {
                $b->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            }))
            ->when($plan !== 'all' && is_numeric($plan),
                fn (Builder $b) => $b->where('subscription_plan_id', (int) $plan))
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        // Status + term filters are applied in PHP (not SQL) because
        // the canonical "status" is computed by SubscriptionService
        // and the cycle is derived by matching the Cashier price ID
        // against the plan's monthly/yearly price IDs. Re-implementing
        // either as a query would be painful for no real win at
        // paid-plan volumes.
        $rows = $paginator->getCollection()
            ->map(fn (User $u) => $this->present($u))
            ->when($status !== 'all', fn (Collection $c) => $c->where('status', $status)->values())
            ->when($term !== 'all', fn (Collection $c) => $c->where('plan.cycle', $term)->values());

        $planMap = $this->buildPlanByPriceId();

        return Inertia::render('Admin/Subscriptions/Index', [
            'subscriptions' => [
                'data' => $rows->all(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
            'filters' => [
                'q' => $q,
                'plan' => $plan,
                'status' => $status,
                'term' => $term,
            ],
            'plans' => $this->planOptions(),
            'stats' => $this->buildStats($paidPlanIds, $planMap),
        ]);
    }

    /**
     * Project a paid-plan user into a row for the admin Subscriptions
     * table. Pulls together the local plan assignment, the matching
     * Cashier subscription (if any), and the credit balance window.
     *
     * @return array<string, mixed>
     */
    private function present(User $user): array
    {
        $plan = $user->subscriptionPlan;
        $balance = $user->creditBalance;

        // Cashier sub for the canonical "default" subscription type
        // — there's at most one. May be null on admin-granted plans.
        $cashier = $user->subscriptions
            ->firstWhere('type', SubscriptionService::CASHIER_SUBSCRIPTION_NAME);

        $cycle = $this->resolveCycle($plan, $cashier?->stripe_price);
        $unitPrice = match ($cycle) {
            'yearly' => (float) ($plan->yearly_price ?? 0),
            default => (float) ($plan->monthly_price ?? 0),
        };

        $startedAt = $cashier?->created_at ?? $balance?->period_starts_at;
        $endsAt = $cashier?->ends_at ?? $balance?->period_ends_at;
        $lastPaymentAt = $balance?->last_renewed_at;

        return [
            'id' => (int) $user->id,
            'user' => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
                'email' => (string) $user->email,
                'avatar' => $user->avatar,
            ],
            'plan' => [
                'id' => (int) $plan->id,
                'name' => (string) $plan->name,
                'slug' => (string) $plan->slug,
                'cycle' => $cycle,
                'unit_price' => $unitPrice,
                'currency' => (string) ($plan->currency ?? 'USD'),
            ],
            'status' => $this->subscriptions->resolveStatus($user),
            'is_stripe_managed' => $cashier !== null,
            'started_at' => optional($startedAt)->toIso8601String(),
            'ends_at' => optional($endsAt)->toIso8601String(),
            'last_payment_at' => optional($lastPaymentAt)->toIso8601String(),
        ];
    }

    /**
     * Match the Cashier subscription's stored Stripe price ID against
     * the plan's monthly / yearly price IDs. Falls back to monthly so
     * admin-granted plans (no Cashier row, no `stripe_price`) still
     * display a sensible cycle in the table.
     */
    private function resolveCycle(?SubscriptionPlan $plan, ?string $stripePrice): string
    {
        if ($plan === null) {
            return 'monthly';
        }

        if ($stripePrice !== null && $stripePrice !== '') {
            if ($stripePrice === $plan->stripe_yearly_price_id) {
                return 'yearly';
            }
            if ($stripePrice === $plan->stripe_monthly_price_id) {
                return 'monthly';
            }
        }

        return 'monthly';
    }

    /**
     * Build a stripe_price_id => ['plan' => …, 'cycle' => …] map used
     * by the stats card to compute MRR off the Cashier subscriptions
     * table without re-loading every plan per row.
     *
     * @return array<string, array{plan: SubscriptionPlan, cycle: 'monthly'|'yearly'}>
     */
    private function buildPlanByPriceId(): array
    {
        $map = [];
        foreach (SubscriptionPlan::query()->get() as $plan) {
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
     * Top-of-page stat cards. Computed off the entire paid-plan user
     * base (not the current filter) so the numbers stay stable as the
     * admin slices and dices the table.
     *
     * @param  Collection<int, int>  $paidPlanIds
     * @param  array<string, array{plan: SubscriptionPlan, cycle: 'monthly'|'yearly'}>  $planByPriceId
     * @return array<string, mixed>
     */
    private function buildStats(Collection $paidPlanIds, array $planByPriceId): array
    {
        $paidUsers = User::query()
            ->whereIn('subscription_plan_id', $paidPlanIds)
            ->with(['subscriptionPlan', 'creditBalance', 'subscriptions'])
            ->get();

        $bucket = ['active' => 0, 'trialing' => 0, 'past_due' => 0, 'canceled' => 0, 'expired' => 0];
        foreach ($paidUsers as $u) {
            $st = $this->subscriptions->resolveStatus($u);
            if ($st === 'on_grace_period') {
                $st = 'canceled';
            }
            if (! isset($bucket[$st])) {
                continue;
            }
            $bucket[$st]++;
        }

        // MRR: sum the monthly-equivalent of every healthy paid sub.
        // Stripe-managed rows use the matched price → plan lookup so a
        // user on the yearly cycle contributes plan.yearly_price/12.
        // Manual grants (no Cashier row) fall back to plan.monthly_price.
        $mrr = 0.0;
        $currency = 'USD';
        foreach ($paidUsers as $u) {
            $st = $this->subscriptions->resolveStatus($u);
            if (! in_array($st, ['active', 'trialing', 'on_grace_period'], true)) {
                continue;
            }
            $plan = $u->subscriptionPlan;
            if ($plan === null) {
                continue;
            }
            $currency = $plan->currency ?? $currency;

            $cashier = $u->subscriptions
                ->firstWhere('type', SubscriptionService::CASHIER_SUBSCRIPTION_NAME);
            $cycle = $this->resolveCycle($plan, $cashier?->stripe_price);

            $mrr += $cycle === 'yearly'
                ? ((float) $plan->yearly_price) / 12.0
                : (float) $plan->monthly_price;
        }

        // Cashier-managed sub count gives the admin a quick read on
        // how many seats are running through Stripe vs. comp / manual
        // grants — useful when reconciling against Stripe Dashboard.
        $stripeManaged = Subscription::query()
            ->where('type', SubscriptionService::CASHIER_SUBSCRIPTION_NAME)
            ->whereIn('user_id', $paidUsers->pluck('id'))
            ->count();

        return [
            'total' => $paidUsers->count(),
            'active' => $bucket['active'] + $bucket['trialing'],
            'trialing' => $bucket['trialing'],
            'past_due' => $bucket['past_due'],
            'canceled' => $bucket['canceled'] + $bucket['expired'],
            'stripe_managed' => $stripeManaged,
            'mrr' => round($mrr, 2),
            'currency' => $currency,
        ];
    }

    /**
     * Plans dropdown — paid plans only, in the same display order the
     * Users / Plans pages use.
     *
     * @return array<int, array<string, mixed>>
     */
    private function planOptions(): array
    {
        return SubscriptionPlan::query()
            ->where(function (Builder $b) {
                $b->where('monthly_price', '>', 0)
                    ->orWhere('yearly_price', '>', 0);
            })
            ->orderBy('sort_order')
            ->orderBy('monthly_price')
            ->get(['id', 'name', 'slug'])
            ->map(fn (SubscriptionPlan $p) => [
                'id' => (int) $p->id,
                'name' => (string) $p->name,
                'slug' => (string) $p->slug,
            ])
            ->all();
    }
}

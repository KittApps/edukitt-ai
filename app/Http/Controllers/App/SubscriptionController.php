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

namespace App\Http\Controllers\App;

use App\Ai\Tracking\Analytics\TokenUsageAggregator;
use App\Http\Controllers\Controller;
use App\Models\CreditPackage;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserCreditDailyUsage;
use App\Services\Billing\AccessGuard;
use App\Services\Billing\CreditPricingService;
use App\Services\Billing\CreditService;
use App\Services\Billing\StripeSettingsResolver;
use App\Services\Billing\SubscriptionService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpFoundationResponse;

/**
 * User-facing Subscription page.
 *
 * Renders the Plans / Credits / Usage tabs with real data and exposes
 * the Stripe Checkout + Billing Portal entry points. All Stripe-bound
 * actions go through Cashier's Billable trait on the User model so the
 * controller never touches the Stripe SDK directly.
 */
class SubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
        private readonly CreditService $credits,
        private readonly CreditPricingService $pricing,
        private readonly AccessGuard $access,
        private readonly StripeSettingsResolver $stripeSettings,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $this->credits->renewIfPeriodElapsed($user);
        $user->refresh();

        $plan = $user->subscriptionPlan;
        $balance = $this->credits->getOrCreateBalance($user);

        $plans = SubscriptionPlan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('monthly_price')
            ->get();

        $packages = CreditPackage::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('credits')
            ->get();

        $monthStart = $this->resolveMonthStart($request->query('month'));

        $isExpired = $this->access->isOnExpiredPaidPlan($user);

        return Inertia::render('App/Subscription/Index', [
            'creditsEnabled' => $this->pricing->creditsEnabled(),
            'currentPlan' => $plan ? $this->presentCurrent($user, $plan, $isExpired) : null,
            'plans' => $plans->map(fn (SubscriptionPlan $p) => $this->presentPlan($p, $plan?->id)),
            'creditBalance' => $this->presentBalance($balance),
            'creditPacks' => $packages->map(fn (CreditPackage $pkg) => $this->presentPackage($pkg)),
            'usage' => [
                'period_start' => $balance->period_starts_at?->toIso8601String(),
                'period_end' => $balance->period_ends_at?->toIso8601String(),
                'total_used' => $balance->total_used_this_period,
                'chart' => $this->presentUsageChart($user, $monthStart),
            ],
            'stripe' => [
                'configured' => $this->stripeSettings->isConfigured(),
                'has_paid_subscription' => $user->subscribed(SubscriptionService::CASHIER_SUBSCRIPTION_NAME),
            ],
            'expiredBanner' => $isExpired ? [
                'previous_plan' => $user->previousPaidPlan?->name,
            ] : null,
        ]);
    }

    /**
     * Send the user to Stripe's hosted Customer Portal.
     *
     * Cashier's `redirectToBillingPortal()` returns a plain
     * `RedirectResponse` which Inertia's XHR client can't follow to an
     * external URL — it renders as an opaque AJAX response and the
     * browser ends up CORS-blocking the cross-origin Stripe URL. We grab
     * the portal URL via `billingPortalUrl()` and hand it to
     * `Inertia::location()` so Inertia replies with a 409 +
     * `X-Inertia-Location` header for XHR navigations and a real
     * `RedirectResponse` for full page loads.
     */
    public function billingPortal(Request $request): RedirectResponse|HttpFoundationResponse
    {
        $user = $request->user();

        if (! $this->stripeSettings->isConfigured()) {
            return back()->withErrors(['stripe' => 'Stripe is not configured yet.']);
        }

        $portalUrl = $user->billingPortalUrl(route('app.subscription'));

        return Inertia::location($portalUrl);
    }

    /**
     * Start a Stripe Checkout session for the given plan + cycle.
     * Free plans are switched instantly without Stripe.
     *
     * Short-circuits (already on free plan, validation, Stripe not
     * configured, missing price id) yield a `RedirectResponse`. The
     * happy paid-checkout path used to return Cashier's `Checkout`
     * Responsable directly, which renders Cashier's "Redirecting to
     * Stripe…" HTML — but Inertia XHR requests can't follow that, so
     * the browser would CORS-block the eventual Stripe URL. We now
     * pull the session URL off the Checkout object and hand it to
     * `Inertia::location()`, which works both for Inertia XHR (409 +
     * `X-Inertia-Location` header) and full page loads (a real
     * `RedirectResponse`). The widened return type covers both.
     */
    public function checkout(Request $request, SubscriptionPlan $plan, string $cycle): RedirectResponse|HttpFoundationResponse
    {
        $user = $request->user();

        if (! $plan->is_active) {
            return back()->withErrors(['plan' => 'That plan is no longer available.']);
        }

        if ($plan->isFree()) {
            // Same upgrade/downgrade rule as the admin manual path.
            $this->subscriptions->applyManualPlanChange($user, $plan);

            return redirect()->route('app.subscription')->with('success', 'Switched to free plan.');
        }

        if (! $this->stripeSettings->isConfigured()) {
            return back()->withErrors(['stripe' => 'Stripe is not configured yet.']);
        }

        $priceId = $cycle === 'yearly'
            ? $plan->stripe_yearly_price_id
            : $plan->stripe_monthly_price_id;

        if (! $priceId) {
            return back()->withErrors(['plan' => 'This plan has not been wired to Stripe yet.']);
        }

        $session = $user
            ->newSubscription(SubscriptionService::CASHIER_SUBSCRIPTION_NAME, $priceId)
            ->checkout([
                'success_url' => route('app.subscription').'?checkout=success',
                'cancel_url' => route('app.subscription').'?checkout=cancel',
            ]);

        return Inertia::location($session->url);
    }

    /**
     * Swap an existing Stripe subscription to a different plan/cycle.
     *
     * Four branches:
     *   - No active Stripe subscription → punt to checkout (first-time
     *     paid flow with payment-method collection).
     *   - Target is a free plan → cancel the Stripe subscription
     *     immediately (we promised "takes effect now" in the downgrade
     *     confirm modal) and align the local plan reference. The
     *     webhook handler's `customer.subscription.deleted` path
     *     would also call `downgradeToFreePlan()` later, but by then
     *     the user is already on a free plan so the previous-paid
     *     stash short-circuits.
     *   - Upgrade (target monthly price > current) → `swapAndInvoice`
     *     so Stripe bills the prorated difference today instead of
     *     stacking it onto the next invoice. Matches the "you'll be
     *     charged today" copy in `ConfirmPlanChangeModal`.
     *   - Downgrade (target monthly price < current) → vanilla
     *     `swap()` so the credit stays on the customer's balance and
     *     deferred-prorates against the next invoice.
     *
     * Upgrade direction is decided via `SubscriptionService::isUpgrade()`
     * so the controller and `applyManualPlanChange()` can never drift.
     *
     * Failure modes on the Stripe call:
     *   - `IncompletePayment` with `requiresAction()` → 3DS / SCA flow,
     *     redirect to Cashier's hosted confirmation page; the eventual
     *     `customer.subscription.updated` webhook syncs local state.
     *   - `IncompletePayment` without action (declined / payment
     *     method required) → render a friendly error in the modal.
     *   - `\Stripe\Exception\CardException` → same treatment.
     */
    public function swap(Request $request, SubscriptionPlan $plan, string $cycle): RedirectResponse|HttpFoundationResponse
    {
        $user = $request->user();

        $subscription = $user->subscription(SubscriptionService::CASHIER_SUBSCRIPTION_NAME);
        if ($subscription === null) {
            return redirect()->route('app.subscription.checkout', [
                'plan' => $plan->id,
                'cycle' => $cycle,
            ]);
        }

        if ($plan->isFree()) {
            $subscription->cancelNow();
            $this->subscriptions->applyManualPlanChange($user, $plan);

            return redirect()->route('app.subscription')->with('success', 'Switched to free plan.');
        }

        $priceId = $cycle === 'yearly'
            ? $plan->stripe_yearly_price_id
            : $plan->stripe_monthly_price_id;

        if (! $priceId) {
            return back()->withErrors(['plan' => 'This plan has not been wired to Stripe yet.']);
        }

        $isUpgrade = $this->subscriptions->isUpgrade($user->subscriptionPlan, $plan);

        try {
            if ($isUpgrade) {
                $subscription->swapAndInvoice($priceId);
            } else {
                $subscription->swap($priceId);
            }
        } catch (\Laravel\Cashier\Exceptions\IncompletePayment $e) {
            if ($e->payment->requiresAction()) {
                // 3DS / SCA — hand off to Cashier's hosted confirmation
                // page. The customer.subscription.updated webhook fires
                // once the user completes the challenge and that path
                // calls applyManualPlanChange() for us.
                return Inertia::location(route('cashier.payment', [
                    $e->payment->id,
                    'redirect' => route('app.subscription'),
                ]));
            }

            return back()->withErrors([
                'plan' => 'Your card was declined. Please update your payment method and try again.',
            ]);
        } catch (\Stripe\Exception\CardException $e) {
            return back()->withErrors([
                'plan' => 'Your card was declined. Please update your payment method and try again.',
            ]);
        }

        $this->subscriptions->applyManualPlanChange($user, $plan);

        return redirect()->route('app.subscription')->with('success', 'Plan updated.');
    }

    /**
     * One-off Stripe Checkout for a credit package.
     *
     * Short-circuits yield a `RedirectResponse`. The happy path used
     * to return Cashier's `Checkout` Responsable directly which broke
     * Inertia XHR navigations the same way the subscription
     * `checkout()` did — see that method's docblock for the full
     * rationale. We now pass the Stripe-hosted URL through
     * `Inertia::location()` instead.
     */
    public function creditCheckout(Request $request, CreditPackage $package): RedirectResponse|HttpFoundationResponse
    {
        $user = $request->user();

        if (! $package->is_active) {
            return back()->withErrors(['package' => 'That credit pack is no longer available.']);
        }

        if (! $this->stripeSettings->isConfigured()) {
            return back()->withErrors(['stripe' => 'Stripe is not configured yet.']);
        }

        if (! $package->stripe_price_id) {
            return back()->withErrors(['package' => 'This credit pack has not been wired to Stripe yet.']);
        }

        $session = $user->checkout([$package->stripe_price_id => 1], [
            'mode' => 'payment',
            'success_url' => route('app.subscription').'?checkout=credits_success&package='.$package->id,
            'cancel_url' => route('app.subscription').'?checkout=cancel',
            'metadata' => [
                'credit_package_id' => $package->id,
                'user_id' => $user->id,
            ],
        ]);

        return Inertia::location($session->url);
    }

    private function presentCurrent($user, SubscriptionPlan $plan, bool $isExpired): array
    {
        $cashierSub = $user->subscription(SubscriptionService::CASHIER_SUBSCRIPTION_NAME);

        $status = 'inactive';
        $cycle = null;
        $renewsAt = null;

        if ($cashierSub !== null) {
            $renewsAt = $cashierSub->asStripeSubscription()->current_period_end ?? null;
            $renewsAt = $renewsAt ? CarbonImmutable::createFromTimestamp($renewsAt)->toIso8601String() : null;

            if ($cashierSub->canceled() && $cashierSub->onGracePeriod()) {
                $status = 'canceled';
            } elseif ($cashierSub->pastDue()) {
                $status = 'past_due';
            } elseif ($cashierSub->active()) {
                $status = 'active';
                $cycle = $cashierSub->stripe_price === $plan->stripe_yearly_price_id ? 'yearly' : 'monthly';
            }
        } elseif ($plan->isFree() && ! $isExpired) {
            $status = 'free';
        }

        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'tagline' => $plan->tagline ?? '',
            'status' => $status,
            'billing_cycle' => $cycle,
            'renews_at' => $renewsAt,
        ];
    }

    private function presentPlan(SubscriptionPlan $p, ?int $currentPlanId): array
    {
        return [
            'id' => $p->id,
            'slug' => $p->slug,
            'name' => $p->name,
            'tagline' => $p->tagline ?? '',
            'monthly_price' => (float) $p->monthly_price,
            'yearly_price' => (float) $p->yearly_price,
            'currency' => $p->currency,
            'credits_per_month' => $p->default_credits,
            'is_current' => $currentPlanId === $p->id,
            'is_popular' => $p->is_popular,
            'is_free' => $p->isFree(),
            'cta_label' => $p->cta_label ?? ($p->isFree() ? 'Switch to Free' : 'Upgrade'),
            'features' => $p->displayFeatures(),
            'has_stripe_monthly' => ! empty($p->stripe_monthly_price_id),
            'has_stripe_yearly' => ! empty($p->stripe_yearly_price_id),
        ];
    }

    private function presentBalance($balance): array
    {
        return [
            'used' => $balance->total_used_this_period,
            'plan_remaining' => $balance->plan_credits_remaining,
            'purchased_remaining' => $balance->purchased_credits_remaining,
            'total' => $balance->periodCapacity(),
            'period_start' => $balance->period_starts_at?->toIso8601String(),
            'resets_at' => $balance->period_ends_at?->toIso8601String(),
        ];
    }

    /**
     * Build the Usage-tab stacked-area chart payload for the given month.
     *
     * Reads `user_credit_daily_usages` in a single indexed SELECT with no
     * SUM/JOIN, then reshapes into a date-keyed series the frontend can
     * hand straight to recharts. Fills every day in the month with zeros
     * for missing buckets so the x-axis stays continuous.
     *
     * @return array{
     *   period: array{start: string, end: string, label: string, prev: string, next: string},
     *   taskTypes: array<int, string>,
     *   taskLabels: array<string, string>,
     *   series: array<int, array<string, mixed>>,
     *   totals: array<string, int>,
     *   totalCredits: int,
     * }
     */
    public function presentUsageChart(User $user, ?CarbonImmutable $monthStart = null): array
    {
        $tz = config('app.timezone');
        $monthStart = $monthStart
            ? $monthStart->setTimezone($tz)->startOfMonth()
            : CarbonImmutable::now($tz)->startOfMonth();
        $monthEnd = $monthStart->endOfMonth();

        $rows = UserCreditDailyUsage::query()
            ->where('user_id', $user->id)
            ->whereBetween('date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get(['date', 'task_type', 'credits_used']);

        // Bucket lookup: date → task_type → credits_used.
        $bucketed = [];
        $taskTypeSet = [];
        foreach ($rows as $row) {
            $dateKey = $row->date->toDateString();
            $taskType = (string) $row->task_type;
            $bucketed[$dateKey][$taskType] = (int) $row->credits_used;
            $taskTypeSet[$taskType] = true;
        }

        // Always include known task types so the legend stays stable even
        // when a particular bucket has no rows in this month.
        foreach (array_keys(TokenUsageAggregator::TASK_LABELS) as $known) {
            $taskTypeSet[$known] = true;
        }
        $taskTypes = array_keys($taskTypeSet);
        sort($taskTypes);

        $series = [];
        $totals = array_fill_keys($taskTypes, 0);
        $cursor = $monthStart;
        while ($cursor->lessThanOrEqualTo($monthEnd)) {
            $dateKey = $cursor->toDateString();
            $point = ['date' => $dateKey];
            foreach ($taskTypes as $taskType) {
                $value = $bucketed[$dateKey][$taskType] ?? 0;
                $point[$taskType] = $value;
                $totals[$taskType] += $value;
            }
            $series[] = $point;
            $cursor = $cursor->addDay();
        }

        $taskLabels = [];
        foreach ($taskTypes as $taskType) {
            $taskLabels[$taskType] = TokenUsageAggregator::TASK_LABELS[$taskType]
                ?? ucwords(str_replace('_', ' ', $taskType));
        }

        return [
            'period' => [
                'start' => $monthStart->toDateString(),
                'end' => $monthEnd->toDateString(),
                'label' => $monthStart->format('F Y'),
                'prev' => $monthStart->subMonth()->format('Y-m'),
                'next' => $monthStart->addMonth()->format('Y-m'),
            ],
            'taskTypes' => $taskTypes,
            'taskLabels' => $taskLabels,
            'series' => $series,
            'totals' => $totals,
            'totalCredits' => array_sum($totals),
        ];
    }

    /**
     * Resolve the chart's month from a `?month=YYYY-MM` query parameter,
     * falling back to the current calendar month in the app timezone.
     * Invalid input is silently ignored so a malformed deep link still
     * renders the chart.
     */
    private function resolveMonthStart(mixed $month): ?CarbonImmutable
    {
        if (! is_string($month) || $month === '') {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('Y-m', $month, config('app.timezone'))
                ->startOfMonth();
        } catch (\Throwable) {
            return null;
        }
    }

    private function presentPackage(CreditPackage $pkg): array
    {
        return [
            'id' => $pkg->id,
            'slug' => $pkg->slug,
            'name' => $pkg->name,
            'credits' => $pkg->credits,
            'price' => round($pkg->priceFloat(), 2),
            'currency' => $pkg->currency,
            'per_credit' => round($pkg->perCreditFloat(), 4),
            'badge' => $pkg->badge,
            'has_stripe_price' => ! empty($pkg->stripe_price_id),
        ];
    }
}

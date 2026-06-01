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

namespace App\Services\Billing;

use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * High-level orchestration for plan assignment and Stripe-aware
 * lifecycle. The Stripe-touching methods (swap, checkoutFor, …) are
 * thin wrappers around Cashier's Billable trait so the controller layer
 * stays Stripe-agnostic.
 */
class SubscriptionService
{
    public const CASHIER_SUBSCRIPTION_NAME = 'default';

    public function __construct(
        private readonly CreditService $credits,
    ) {}

    /**
     * Comparison helper that says whether moving `$current` → `$target`
     * is an upgrade in monthly-price terms. "No current plan" counts as
     * an upgrade so a fresh user going to any paid plan is additive on
     * credits. Shared between `applyManualPlanChange()` and the Stripe
     * `swap()` controller path so they always agree on direction.
     */
    public function isUpgrade(?SubscriptionPlan $current, SubscriptionPlan $target): bool
    {
        return $current === null
            || (float) $current->monthly_price < (float) $target->monthly_price;
    }

    /**
     * Single-source-of-truth subscription status for a user.
     *
     * Returns one of: `'active' | 'trialing' | 'on_grace_period' |
     * 'past_due' | 'canceled' | 'expired' | 'no_plan' |
     * 'plan_disabled'`. Mirrors the signals `AccessGuard` uses so an
     * "active" return implies the guard will allow content creation
     * (and vice-versa, the non-active states map to the cases the
     * guard blocks).
     *
     * Highest-severity match wins — admin / display callers can hand
     * the string straight to a pill component without further
     * branching.
     */
    public function resolveStatus(User $user): string
    {
        $plan = $user->subscriptionPlan;

        if ($plan === null) {
            return 'no_plan';
        }

        if (! $plan->is_active) {
            return 'plan_disabled';
        }

        if ($plan->isFree()) {
            return $user->previous_paid_plan_id !== null ? 'expired' : 'active';
        }

        $sub = $user->subscription(self::CASHIER_SUBSCRIPTION_NAME);
        if ($sub !== null) {
            if ($sub->pastDue()) {
                return 'past_due';
            }
            if ($sub->onGracePeriod()) {
                return 'on_grace_period';
            }
            if ($sub->onTrial()) {
                return 'trialing';
            }
            if (! $sub->valid()) {
                return 'canceled';
            }

            return 'active';
        }

        // Paid plan with no Cashier subscription = admin manual grant.
        // Treated as expired once the balance window closes; otherwise
        // active.
        $endsAt = $user->creditBalance?->period_ends_at;
        if ($endsAt !== null && $endsAt->isPast()) {
            return 'expired';
        }

        return 'active';
    }

    /**
     * Resolve the plan a new user should land on. Falls back to the
     * cheapest active plan when no plan is explicitly marked default.
     */
    public function defaultPlan(): ?SubscriptionPlan
    {
        return SubscriptionPlan::query()
            ->where('is_active', true)
            ->where('is_default', true)
            ->orderBy('sort_order')
            ->first()
            ?? SubscriptionPlan::query()
                ->where('is_active', true)
                ->orderBy('monthly_price')
                ->orderBy('sort_order')
                ->first();
    }

    /**
     * Make the user start on the default free plan and seed their
     * credit balance. Idempotent — safe to call multiple times.
     */
    public function assignDefaultPlan(User $user): void
    {
        $plan = $this->defaultPlan();
        if ($plan === null) {
            return;
        }

        if ($user->subscription_plan_id === null) {
            $user->subscription_plan_id = $plan->id;
            $user->save();
        }

        $this->credits->getOrCreateBalance($user->fresh());
    }

    /**
     * Enforce single default plan invariant.
     */
    public function setDefault(SubscriptionPlan $plan): void
    {
        DB::transaction(function () use ($plan) {
            SubscriptionPlan::query()
                ->where('id', '!=', $plan->id)
                ->update(['is_default' => false]);

            $plan->is_default = true;
            $plan->is_active = true;
            $plan->save();
        });
    }

    /**
     * Move the user to a free (Stripe-less) plan and reset the
     * credit allowance to match. Used when a paid subscription expires
     * or is canceled and the grace period ends.
     */
    public function downgradeToFreePlan(User $user): void
    {
        $previousPlan = $user->subscriptionPlan;
        $freePlan = $this->defaultPlan();

        if ($freePlan === null) {
            return;
        }

        if ($previousPlan && ! $previousPlan->isFree()) {
            $user->previous_paid_plan_id = $previousPlan->id;
        }

        $user->subscription_plan_id = $freePlan->id;
        $user->save();

        $now = CarbonImmutable::now();
        $this->credits->renewPlanCredits($user, $freePlan, $now, $now->addMonth());
    }

    /**
     * Switch the user to a new plan (paid or free) and refresh credits.
     * Mid-period upgrades add the new plan's credits to the existing
     * remainder per the product brief.
     */
    public function applyPlanChange(
        User $user,
        SubscriptionPlan $plan,
        ?CarbonImmutable $periodStart = null,
        ?CarbonImmutable $periodEnd = null,
        bool $additive = false,
    ): void {
        $user->subscription_plan_id = $plan->id;
        if (! $plan->isFree()) {
            $user->previous_paid_plan_id = null;
        }
        $user->save();

        if ($additive) {
            $this->credits->addPlanCreditsOnUpgrade($user, $plan);

            return;
        }

        $this->credits->renewPlanCredits($user, $plan, $periodStart, $periodEnd);
    }

    /**
     * Canonical entry point for *non-Stripe* plan transitions.
     *
     * Encapsulates the same upgrade-additive / downgrade-replace rule
     * the user-facing Subscription swap flow already uses, plus the
     * "clear plan entirely" case the admin Users → Edit pane exposes
     * (the regular user flows always land on a default free plan, so
     * `null` is admin-only).
     *
     *   - `null` target → zero plan credits, keep purchased, stash the
     *     previous paid plan into `previous_paid_plan_id` so the
     *     "Your plan expired" banner stays consistent with the Stripe
     *     cancel path ({@see downgradeToFreePlan}).
     *   - Free target → full credit reset (never additive); previous
     *     paid plan is stashed if the old plan was paid.
     *   - Paid target → additive when coming from no plan or a cheaper
     *     plan (upgrade), replace otherwise (downgrade). Matches the
     *     rule inlined in `SubscriptionController::swap()` and is now
     *     the single source of truth for both callers.
     *
     * `$periodStart` / `$periodEnd` are explicit overrides; when
     * omitted the underlying credit calls fall back to "now" / "+1
     * month". The override is also honoured on the additive path
     * (which normally leaves the period untouched) so an admin can
     * cleanly extend a window while upgrading.
     */
    public function applyManualPlanChange(
        User $user,
        ?SubscriptionPlan $newPlan,
        ?CarbonImmutable $periodStart = null,
        ?CarbonImmutable $periodEnd = null,
    ): void {
        $current = $user->subscriptionPlan;
        $wasPaid = $current !== null && ! $current->isFree();

        if ($newPlan === null) {
            if ($wasPaid) {
                $user->previous_paid_plan_id = $current->id;
            }
            $user->subscription_plan_id = null;
            $user->save();

            $this->credits->clearPlanCredits($user, $periodStart, $periodEnd);

            return;
        }

        // Switching to a free plan from a paid one is treated as a
        // downgrade — keep the prior paid plan reference so the
        // "expired" banner still has something to point at.
        if ($newPlan->isFree() && $wasPaid) {
            $user->previous_paid_plan_id = $current->id;
        }

        if ($newPlan->isFree()) {
            $this->applyPlanChange(
                $user,
                $newPlan,
                $periodStart,
                $periodEnd,
                additive: false,
            );

            return;
        }

        $isUpgrade = $this->isUpgrade($current, $newPlan);

        $this->applyPlanChange(
            $user,
            $newPlan,
            $periodStart,
            $periodEnd,
            additive: $isUpgrade,
        );

        // The additive path intentionally leaves the period window
        // alone (mid-period upgrades stack credits on top of the
        // existing cycle). When the caller wants an explicit window
        // we apply it here so the admin pane never silently drops
        // the dates the operator just typed in.
        if ($isUpgrade && $periodStart !== null && $periodEnd !== null) {
            $this->credits->setPeriodWindow($user, $periodStart, $periodEnd);
        }
    }
}

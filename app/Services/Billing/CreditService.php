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

use App\Exceptions\Billing\OutOfCreditsException;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserCreditBalance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * All credit reads and writes flow through this service.
 *
 * Writes are wrapped in a DB transaction with a row-level lock on
 * the user's user_credit_balances row so concurrent AI requests from
 * the same user cannot double-spend the same credits. Pre-check and
 * debit are separate calls because the actual token cost is only
 * known after the LLM call returns.
 *
 * Bucket order:
 *   - Always draw from plan_credits_remaining first.
 *   - Spill into purchased_credits_remaining when plan credits run out.
 *
 * Renewal rules:
 *   - rollover_unused_credits=false → plan bucket resets to plan.default_credits.
 *   - rollover_unused_credits=true  → plan bucket = old_plan_bucket + plan.default_credits.
 *   - purchased_credits_remaining is never touched on renewal.
 */
class CreditService
{
    public function __construct(
        private readonly CreditPricingService $pricing,
    ) {}

    /**
     * Read or create the per-user balance row. Free plans get an
     * immediate period set so the renewal cron has something to
     * compare against.
     */
    public function getOrCreateBalance(User $user): UserCreditBalance
    {
        $balance = $user->creditBalance()->first();
        if ($balance !== null) {
            return $balance;
        }

        return DB::transaction(function () use ($user) {
            $existing = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            $plan = $user->subscriptionPlan;
            $now = CarbonImmutable::now();
            $defaultCredits = $plan?->default_credits ?? 0;

            return UserCreditBalance::create([
                'user_id' => $user->id,
                'plan_credits_remaining' => $defaultCredits,
                'purchased_credits_remaining' => 0,
                'total_used_this_period' => 0,
                'period_starts_at' => $now,
                'period_ends_at' => $now->addMonth(),
                'last_renewed_at' => $now,
            ]);
        });
    }

    /**
     * Pre-check: throws OutOfCreditsException if the user does not have
     * at least `required` credits available right now. Credits are not
     * reserved — the post-charge step is what actually debits.
     */
    public function assertHasCredits(User $user, int $required): void
    {
        if (! $this->pricing->creditsEnabled()) {
            return;
        }

        $balance = $this->getOrCreateBalance($user);
        $available = $balance->availableCredits();

        if ($available < $required) {
            throw new OutOfCreditsException(
                required: $required,
                available: $available,
            );
        }
    }

    /**
     * Debit `credits` from the user's balance and increment the matching
     * `user_credit_daily_usages` bucket so the Usage chart picks it up.
     *
     * Bucket order is plan first, then purchased. Wrapped in a
     * transaction with FOR UPDATE on the balance row so concurrent
     * requests from the same user are serialised. The daily-usage
     * write uses an UPSERT keyed on `(user_id, date, task_type)` so
     * concurrent calls atomically increment the matching row instead
     * of inserting duplicates.
     */
    public function debit(User $user, int $credits, string $taskType): void
    {
        if ($credits <= 0) {
            $credits = 1;
        }

        DB::transaction(function () use ($user, $credits, $taskType) {
            $balance = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($balance === null) {
                // Lazy create inside the same transaction so we still
                // hold a lock for the subsequent debit.
                $balance = $this->createBalanceWithinTransaction($user);
            }

            if ($this->pricing->creditsEnabled()
                && $balance->availableCredits() < $credits) {
                // Race with another concurrent request; bubble up so the
                // caller can map to the OutOfCredits UX.
                throw new OutOfCreditsException(
                    required: $credits,
                    available: $balance->availableCredits(),
                );
            }

            // Draw from plan first, then purchased.
            $remainingToCharge = $credits;
            $planUsed = min($balance->plan_credits_remaining, $remainingToCharge);
            $remainingToCharge -= $planUsed;
            $purchasedUsed = min($balance->purchased_credits_remaining, $remainingToCharge);
            $remainingToCharge -= $purchasedUsed;

            $totalDebited = $planUsed + $purchasedUsed;

            // When credits are disabled, both buckets stay empty and the
            // debit becomes a no-op for accounting purposes; we still
            // record the daily rollup so the Usage chart stays useful.
            if ($this->pricing->creditsEnabled()) {
                $balance->plan_credits_remaining -= $planUsed;
                $balance->purchased_credits_remaining -= $purchasedUsed;
                $balance->total_used_this_period += $totalDebited;
                $balance->save();
            }

            // The chart shows credits actually spent, so when credits are
            // disabled (free-tier dev/testing) we record the requested
            // amount instead of zero. Driver-agnostic UPSERT: the unique
            // index on (user_id, date, task_type) keeps it atomic.
            $rollupCredits = $this->pricing->creditsEnabled() ? $totalDebited : $credits;
            $today = today()->toDateString();

            DB::table('user_credit_daily_usages')->upsert(
                [[
                    'user_id' => $user->id,
                    'task_type' => $taskType,
                    'date' => $today,
                    'credits_used' => $rollupCredits,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]],
                ['user_id', 'date', 'task_type'],
                [
                    'credits_used' => DB::raw("credits_used + {$rollupCredits}"),
                    'updated_at' => now(),
                ],
            );
        });
    }

    /**
     * Top up the purchased bucket. Used by Stripe webhooks after a
     * one-off credit pack checkout completes. Purchased credits never
     * expire so this method does not touch the period columns.
     */
    public function addPurchasedCredits(User $user, int $credits): UserCreditBalance
    {
        if ($credits <= 0) {
            return $this->getOrCreateBalance($user);
        }

        return DB::transaction(function () use ($user, $credits) {
            $balance = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($balance === null) {
                $balance = $this->createBalanceWithinTransaction($user);
            }

            $balance->purchased_credits_remaining += $credits;
            $balance->save();

            return $balance;
        });
    }

    /**
     * Refresh the plan bucket and reset the period window.
     *
     * Called from:
     *   - the daily free-plan renewal cron / login hook,
     *   - Stripe webhooks on invoice.paid / subscription.updated,
     *   - manually when the admin toggles a user's plan.
     */
    public function renewPlanCredits(
        User $user,
        SubscriptionPlan $plan,
        ?CarbonImmutable $periodStart = null,
        ?CarbonImmutable $periodEnd = null,
    ): UserCreditBalance {
        $start = $periodStart ?? CarbonImmutable::now();
        $end = $periodEnd ?? $start->addMonth();

        return DB::transaction(function () use ($user, $plan, $start, $end) {
            $balance = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($balance === null) {
                $balance = $this->createBalanceWithinTransaction($user);
            }

            $carryover = $plan->rollover_unused_credits
                ? $balance->plan_credits_remaining
                : 0;

            $balance->plan_credits_remaining = $plan->default_credits + $carryover;
            $balance->total_used_this_period = 0;
            $balance->period_starts_at = $start;
            $balance->period_ends_at = $end;
            $balance->last_renewed_at = CarbonImmutable::now();
            $balance->save();

            return $balance;
        });
    }

    /**
     * Zero out the plan bucket while leaving purchased credits intact.
     *
     * Used when an admin manually clears a user's plan from the Users
     * → Edit → Subscription pane. The regular subscription flows
     * always land a user on a default free plan, so this code path is
     * admin-only; it mirrors the period-reset semantics of
     * {@see renewPlanCredits()} so the renewal cron has a stable
     * anchor afterwards.
     */
    public function clearPlanCredits(
        User $user,
        ?CarbonImmutable $periodStart = null,
        ?CarbonImmutable $periodEnd = null,
    ): UserCreditBalance {
        $start = $periodStart ?? CarbonImmutable::now();
        $end = $periodEnd ?? $start->addMonth();

        return DB::transaction(function () use ($user, $start, $end) {
            $balance = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($balance === null) {
                $balance = $this->createBalanceWithinTransaction($user);
            }

            $balance->plan_credits_remaining = 0;
            $balance->total_used_this_period = 0;
            $balance->period_starts_at = $start;
            $balance->period_ends_at = $end;
            $balance->last_renewed_at = CarbonImmutable::now();
            $balance->save();

            return $balance;
        });
    }

    /**
     * Overwrite just the period window on the balance row without
     * touching any credit columns. Used by the admin Subscription pane
     * to extend or backdate a user's current period without otherwise
     * changing their plan.
     */
    public function setPeriodWindow(
        User $user,
        CarbonImmutable $start,
        CarbonImmutable $end,
    ): UserCreditBalance {
        return DB::transaction(function () use ($user, $start, $end) {
            $balance = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($balance === null) {
                $balance = $this->createBalanceWithinTransaction($user);
            }

            $balance->period_starts_at = $start;
            $balance->period_ends_at = $end;
            $balance->save();

            return $balance;
        });
    }

    /**
     * Apply mid-period plan switch credit math (additive). Used when a
     * free user upgrades to a paid plan mid-period — the requirement is
     * that the new plan's credits stack on top of whatever they had left.
     */
    public function addPlanCreditsOnUpgrade(User $user, SubscriptionPlan $newPlan): UserCreditBalance
    {
        return DB::transaction(function () use ($user, $newPlan) {
            $balance = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($balance === null) {
                $balance = $this->createBalanceWithinTransaction($user);
            }

            $balance->plan_credits_remaining += $newPlan->default_credits;
            $balance->save();

            return $balance;
        });
    }

    /**
     * Lazy renewal entry point. Free-plan users have their period
     * silently refreshed at login (and a daily cron does the same for
     * users who don't log in). Idempotent: if the period is still valid
     * this is a no-op.
     */
    public function renewIfPeriodElapsed(User $user): bool
    {
        $plan = $user->subscriptionPlan;
        if ($plan === null) {
            return false;
        }

        $balance = $this->getOrCreateBalance($user);

        $now = CarbonImmutable::now();
        if ($balance->period_ends_at !== null && $balance->period_ends_at->isFuture()) {
            return false;
        }

        // Anchor the new window to the existing end so monthly cycles stay
        // calendar-aligned for free users. Falls back to "now" when no
        // prior end was recorded (first run).
        $anchor = $balance->period_ends_at
            ? CarbonImmutable::instance($balance->period_ends_at)
            : $now;

        // Don't fall behind by months if the user has been away for a long
        // time — just snap to "now" and refresh.
        if ($anchor->lt($now->subDay())) {
            $anchor = $now;
        }

        $this->renewPlanCredits($user, $plan, $anchor, $anchor->addMonth());

        return true;
    }

    private function createBalanceWithinTransaction(User $user): UserCreditBalance
    {
        $plan = $user->subscriptionPlan;
        $now = CarbonImmutable::now();

        return UserCreditBalance::create([
            'user_id' => $user->id,
            'plan_credits_remaining' => $plan?->default_credits ?? 0,
            'purchased_credits_remaining' => 0,
            'total_used_this_period' => 0,
            'period_starts_at' => $now,
            'period_ends_at' => $now->addMonth(),
            'last_renewed_at' => $now,
        ]);
    }
}

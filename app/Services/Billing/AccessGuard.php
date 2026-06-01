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

use App\Exceptions\Billing\FeatureLimitReachedException;
use App\Models\AiTokenUsage;
use App\Models\User;

/**
 * Resolves whether a user is allowed to invoke a given AI task right
 * now. Handles two distinct cases:
 *
 *   - The user previously had a paid plan that has now expired and
 *     was downgraded back to free: throws FeatureLimitReachedException
 *     (variant: expired_plan). This blocks all create/regenerate flows
 *     regardless of credit balance.
 *
 *   - The user has a plan but is over a per-period feature cap (e.g.
 *     `max_quick_learns` = 10 / month): throws
 *     FeatureLimitReachedException (variant: feature_limit).
 *
 * Read-only flows must NOT call into this guard; the brief calls out
 * that read access stays open even after a plan expires.
 */
class AccessGuard
{
    /**
     * Map of task_type → plan limit key. Only listed tasks are capped.
     * Any task type not in the map is considered uncapped (still
     * credit-gated separately).
     */
    private const TASK_LIMIT_KEYS = [
        'course_outline' => 'max_courses',
        'course_lesson' => 'max_lessons',
        'quick_learn' => 'max_quick_learns',
        'quiz_generate' => 'max_quizzes',
        'content_summary' => null,
    ];

    public function assertCanCreate(User $user, string $taskType): void
    {
        if ($this->isOnExpiredPaidPlan($user)) {
            throw new FeatureLimitReachedException(
                feature: $taskType,
                variant: 'expired_plan',
            );
        }

        $plan = $user->subscriptionPlan;
        if ($plan === null) {
            return;
        }

        $limitKey = self::TASK_LIMIT_KEYS[$taskType] ?? null;
        if ($limitKey === null) {
            return;
        }

        $limit = $plan->limit($limitKey);
        if ($limit === null || $limit < 0) {
            return; // unlimited
        }

        $balance = $user->creditBalance;
        $periodStart = $balance?->period_starts_at;
        if ($periodStart === null) {
            return;
        }

        // Count from `ai_token_usages` instead of a per-call activity log:
        // every prompt() invocation writes one row there with task_type and
        // user_id, so the per-period feature cap stays accurate without a
        // dedicated activity table.
        $used = AiTokenUsage::query()
            ->where('user_id', $user->id)
            ->where('task_type', $taskType)
            ->where('created_at', '>=', $periodStart)
            ->count();

        if ($used >= $limit) {
            throw new FeatureLimitReachedException(
                feature: $taskType,
                variant: 'feature_limit',
            );
        }
    }

    public function isOnExpiredPaidPlan(User $user): bool
    {
        $plan = $user->subscriptionPlan;

        // No plan at all → treat as fully restricted (we should never
        // hit this thanks to the registration hook, but defend it).
        if ($plan === null) {
            return true;
        }

        // Plan row exists but the admin globally disabled it — credits
        // don't entitle the user to keep using a retired plan; force
        // them through the Plans tab to pick a current one.
        if (! $plan->is_active) {
            return true;
        }

        // Was paid before and is now back on a free plan → expired.
        if ($plan->isFree() && $user->previous_paid_plan_id !== null) {
            return true;
        }

        // Paid plan but Cashier no longer reports the subscription as
        // valid (past_due, incomplete, fully canceled past grace).
        // `valid()` covers active / trialing / on-grace-period, so
        // the negation is the entire "billing is in trouble" set.
        // Admin-manual paid grants have no Cashier subscription at all
        // and are intentionally left alone here.
        if (! $plan->isFree()) {
            $sub = $user->subscription(SubscriptionService::CASHIER_SUBSCRIPTION_NAME);
            if ($sub !== null && ! $sub->valid()) {
                return true;
            }
        }

        return false;
    }
}

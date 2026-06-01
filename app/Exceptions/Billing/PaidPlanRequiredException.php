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

namespace App\Exceptions\Billing;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Raised by {@see \App\Services\Ai\TaskAssignmentResolver} when the
 * only generation-ready assignment for a task is flagged
 * `is_paid_only` and the acting user is on a free plan.
 *
 * This is conceptually a billing rejection — the user can't run the
 * task on their current plan and the fix is to upgrade — so we reuse
 * the same 402 envelope shape as {@see FeatureLimitReachedException}
 * /  {@see OutOfCreditsException} so the global `LimitReachedModal`
 * picks it up automatically (sync via the axios 402 interceptor,
 * queued via the polling endpoint's error payload).
 *
 * Distinct `reason: 'paid_plan_required'` so the modal can pick a
 * task-specific title without overloading `feature_limit` (which
 * means "you've hit your monthly cap", not "this feature isn't on
 * your plan at all").
 */
class PaidPlanRequiredException extends RuntimeException
{
    public function __construct(
        public readonly string $taskKey,
        ?string $message = null,
    ) {
        parent::__construct(
            $message ?? "Paid plan required for task [{$taskKey}].",
        );
    }

    public function render(Request $request): Response
    {
        $payload = [
            'ok' => false,
            'reason' => 'paid_plan_required',
            'message' => 'This AI model is only available on a paid plan. Upgrade to use it.',
            'task' => $this->taskKey,
            'cta' => [
                'type' => 'upgrade_plan',
                'href' => route('app.subscription').'?tab=plans',
            ],
        ];

        if ($request->expectsJson() || $request->wantsJson()) {
            return new JsonResponse($payload, 402);
        }

        return OutOfCreditsException::redirectWithLimit($request, $payload);
    }
}

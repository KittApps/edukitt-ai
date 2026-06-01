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
 * Thrown when a user runs into a hard plan-level limit (e.g. max
 * courses / month) or when their previously-paid plan has expired and
 * they no longer have permission to create new content.
 *
 * The HTTP layer redirects users to the Plans tab so they can upgrade
 * — distinct from OutOfCreditsException which redirects to Credits.
 */
class FeatureLimitReachedException extends RuntimeException
{
    public function __construct(
        public readonly string $feature,
        public readonly string $variant = 'feature_limit',
        ?string $message = null,
    ) {
        parent::__construct(
            $message ?? "Plan limit reached for feature [{$feature}].",
        );
    }

    public function render(Request $request): Response
    {
        $payload = [
            'ok' => false,
            'reason' => $this->variant === 'expired_plan' ? 'expired_plan' : 'feature_limit',
            'message' => $this->variant === 'expired_plan'
                ? 'Your plan has expired. Renew to keep creating new content.'
                : "You've reached your plan limit for this feature. Upgrade to keep going.",
            'feature' => $this->feature,
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

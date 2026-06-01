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

namespace App\Http\Middleware;

use App\Exceptions\Billing\FeatureLimitReachedException;
use App\Services\Billing\AccessGuard;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Block create routes when the user is on an expired paid plan.
 *
 * Reads are intentionally not protected by this middleware — only
 * create / regenerate flows should be wrapped, so the existing browsing
 * UX stays available after a plan expires.
 */
class EnsureSubscriptionActive
{
    public function __construct(
        private readonly AccessGuard $guard,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user !== null && $this->guard->isOnExpiredPaidPlan($user)) {
            throw new FeatureLimitReachedException(
                feature: 'create',
                variant: 'expired_plan',
            );
        }

        return $next($request);
    }
}

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
use App\Services\Settings\CertificateSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate all certificate routes behind the global enable toggle and
 * the per-plan `certificates` flag.
 *
 *   - Global toggle off → 404. The feature is supposed to look like
 *     it doesn't exist on this install at all.
 *   - Plan doesn't include certificates → FeatureLimitReachedException
 *     so the existing LimitReachedModal handler routes the user to
 *     the Plans tab to upgrade.
 */
class EnsureCertificatesEnabled
{
    public function __construct(
        private readonly CertificateSettings $settings,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->settings->isEnabled()) {
            abort(404);
        }

        $user = $request->user();
        $plan = $user?->subscriptionPlan;

        if ($plan === null || ! $plan->allowsCertificates()) {
            throw new FeatureLimitReachedException(
                feature: 'certificates',
                variant: 'feature_limit',
            );
        }

        return $next($request);
    }
}

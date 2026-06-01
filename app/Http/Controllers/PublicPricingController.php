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

namespace App\Http\Controllers;

use App\Services\Billing\PublicPlansResolver;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public pricing page at "/pricing".
 *
 * Renders the dynamic list of active plans (managed under
 * /admin/subscription-plans). Signed-in users get redirected to
 * the in-app subscription page where they can actually change
 * plans — the marketing page is conversion-focused only.
 */
class PublicPricingController extends Controller
{
    public function index(Request $request, PublicPlansResolver $plans): Response|\Illuminate\Http\RedirectResponse
    {
        if ($request->user() !== null) {
            return redirect()->route('app.subscription');
        }

        return Inertia::render('Public/Pricing', [
            'plans' => $plans->list(),
        ]);
    }
}

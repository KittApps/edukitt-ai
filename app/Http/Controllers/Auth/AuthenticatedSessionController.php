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

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Billing\CreditService;
use App\Services\Billing\SubscriptionService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();
        if ($user !== null) {
            // Stamp last login first so admin reports reflect this
            // session even if a downstream renewal call later fails.
            // forceFill bypasses fillable since `last_login_at` is
            // never user-supplied and we save without firing model
            // observers we don't have anyway.
            $user->forceFill([
                'last_login_at' => CarbonImmutable::now(),
            ])->save();

            // Make sure brand-new accounts that pre-date the subscription
            // system have a plan and balance row, then lazily renew the
            // free-plan period if it elapsed since the last login.
            $subscriptions = app(SubscriptionService::class);
            if ($user->subscription_plan_id === null) {
                $subscriptions->assignDefaultPlan($user);
                $user->refresh();
            }
            app(CreditService::class)->renewIfPeriodElapsed($user);
        }

        $default = $user?->postAuthenticationRedirectUrl()
            ?? route('app.dashboard', absolute: false);

        return redirect()->intended($default);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}

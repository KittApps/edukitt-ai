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
use App\Models\User;
use App\Rules\Recaptcha;
use App\Services\Billing\SubscriptionService;
use App\Services\LocalizationService;
use App\Services\Settings\GeneralSettings;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function __construct(private readonly GeneralSettings $settings) {}

    /**
     * Display the registration view.
     *
     * Returns a redirect to the login page (with a flash message) when
     * the admin has closed sign-ups via Admin → Settings → General →
     * Register, so even a stale client-side cache lands somewhere
     * useful instead of a broken form.
     */
    public function create(): Response|RedirectResponse
    {
        if (! $this->settings->isRegistrationEnabled()) {
            return redirect()
                ->route('login')
                ->with('status', t('auth.registration.closed', 'Registrations are currently closed.'));
        }

        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        if (! $this->settings->isRegistrationEnabled()) {
            // Same message the GET endpoint flashes — keeps the UX
            // consistent across direct POSTs (cached forms, automation).
            return redirect()
                ->route('login')
                ->with('status', t('auth.registration.closed', 'Registrations are currently closed.'));
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'recaptcha_token' => [new Recaptcha($request->ip())],
        ]);

        // Capture whatever language the visitor had picked on the
        // public pages (via the language switcher)
        $locale = app(LocalizationService::class)->currentCode();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'locale' => $locale,
        ]);

        // When the admin has opted OUT of email verification, mark the
        // account verified immediately. That keeps the rest of the
        // framework's behaviour consistent (User always implements
        // MustVerifyEmail) without forcing the new user through a
        // verification step, AND short-circuits the auto-wired
        // SendEmailVerificationNotification listener below.
        if (! $this->settings->requiresEmailVerification()) {
            $user->markEmailAsVerified();
        }

        app(SubscriptionService::class)->assignDefaultPlan($user);

        event(new Registered($user));

        Auth::login($user);

        return redirect()->intended($user->postAuthenticationRedirectUrl());
    }
}

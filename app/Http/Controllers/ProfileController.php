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

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\Auth\EmailChangeService;
use App\Services\Settings\GeneralSettings;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(
        private readonly EmailChangeService $emailChange,
        private readonly GeneralSettings $settings,
    ) {}

    public function edit(Request $request): Response
    {
        $user = $request->user();
        $pending = $this->emailChange->pendingFor($user);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'verificationRequired' => $this->settings->requiresEmailVerification(),
            'accountDeletionEnabled' => $this->settings->isAccountDeletionEnabled(),
            'pendingEmailChange' => $pending === null ? null : [
                'new_email' => $pending->new_email,
                'expires_at' => $pending->expires_at?->toIso8601String(),
                'last_sent_at' => $pending->last_sent_at?->toIso8601String(),
                'resend_cooldown_seconds' => EmailChangeService::RESEND_COOLDOWN_SECONDS,
            ],
            'status' => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $newEmail = strtolower(trim($data['email']));
        $emailChanged = $newEmail !== strtolower($user->email);

        $user->name = $data['name'];

        if (! $emailChanged) {
            $user->save();

            return Redirect::route('profile.edit');
        }

        if ($this->settings->requiresEmailVerification()) {
            // Name update is independent of the email verification
            // flow — save it now so the user isn't stuck waiting on
            // a code just to change a typo in their display name.
            $user->save();
            $this->emailChange->request($user, $newEmail);

            return Redirect::route('profile.edit')
                ->with('status', 'email-change-code-sent');
        }

        $user->email = $newEmail;
        $user->email_verified_at = null;
        $user->save();

        return Redirect::route('profile.edit');
    }

    public function verifyEmailChange(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'digits:6'],
        ]);

        $this->emailChange->verify($request->user(), $data['code']);

        return Redirect::route('profile.edit')
            ->with('status', 'email-change-verified');
    }

    public function resendEmailChange(Request $request): RedirectResponse
    {
        $this->emailChange->resend($request->user());

        return Redirect::route('profile.edit')
            ->with('status', 'email-change-code-sent');
    }

    public function cancelEmailChange(Request $request): RedirectResponse
    {
        $this->emailChange->cancel($request->user());

        return Redirect::route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        abort_unless($this->settings->isAccountDeletionEnabled(), 403);

        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}

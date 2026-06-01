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

namespace App\Services\Auth;

use App\Models\EmailChangeRequest;
use App\Models\User;
use App\Notifications\Auth\EmailChangeCodeNotification;
use App\Services\LocalizationService;
use App\Services\Queue\QueueSettingsResolver;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Code-based email change flow for users on a "verification required"
 * site. Central place for every rule that protects the change:
 *
 *   - Uniqueness: the new address must not be in use by another user
 *     (checked at request time AND re-checked at verify time, since
 *     a concurrent signup could have claimed it in between).
 *   - Rate limiting: at most one send per
 *     {@see self::RESEND_COOLDOWN_SECONDS}, at most
 *     {@see self::MAX_RESENDS_PER_WINDOW} per rolling
 *     {@see self::RESEND_WINDOW_MINUTES}-minute window.
 *   - Attempt limiting: each request only allows
 *     {@see self::MAX_VERIFY_ATTEMPTS} bad code submissions before it
 *     self-invalidates.
 *   - Code is 6 digits, stored as a bcrypt hash. Plaintext lives only
 *     inside the outbound email + the hashed comparison.
 */
class EmailChangeService
{
    public const CODE_TTL_MINUTES = 15;

    public const RESEND_COOLDOWN_SECONDS = 60;

    public const RESEND_WINDOW_MINUTES = 60;

    public const MAX_RESENDS_PER_WINDOW = 5;

    public const MAX_VERIFY_ATTEMPTS = 5;

    public function __construct(
        private readonly QueueSettingsResolver $queue,
    ) {}

    /**
     * Begin a change to `$newEmail` for `$user`. Replaces any prior
     * pending request for the same user, mails a fresh code.
     */
    public function request(User $user, string $newEmail): EmailChangeRequest
    {
        $newEmail = strtolower(trim($newEmail));

        if ($newEmail === strtolower($user->email)) {
            throw ValidationException::withMessages([
                'email' => 'This is already your current email address.',
            ]);
        }

        $this->assertEmailAvailable($newEmail, $user->id);

        $existing = EmailChangeRequest::query()->where('user_id', $user->id)->first();
        $this->guardResendRate($existing);

        $code = $this->generateCode();
        $now = Carbon::now();

        $payload = [
            'new_email' => $newEmail,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'last_sent_at' => $now,
            'expires_at' => $now->copy()->addMinutes(self::CODE_TTL_MINUTES),
        ];

        if ($existing === null) {
            $payload['user_id'] = $user->id;
            $payload['resend_count'] = 1;
            $payload['resend_window_started_at'] = $now;
            $request = EmailChangeRequest::create($payload);
        } else {
            $window = $this->openResendWindow($existing, $now);
            $payload['resend_count'] = $window['count'];
            $payload['resend_window_started_at'] = $window['started_at'];
            $existing->forceFill($payload)->save();
            $request = $existing->refresh();
        }

        $this->sendCode($user, $newEmail, $code);

        return $request;
    }

    /**
     * Re-send the code for an existing pending request. Throws when
     * the cooldown / window cap is hit so the caller can surface the
     * appropriate user message.
     */
    public function resend(User $user): EmailChangeRequest
    {
        $existing = EmailChangeRequest::query()->where('user_id', $user->id)->firstOrFail();

        $this->assertEmailAvailable($existing->new_email, $user->id);
        $this->guardResendRate($existing);

        $code = $this->generateCode();
        $now = Carbon::now();
        $window = $this->openResendWindow($existing, $now);

        $existing->forceFill([
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'last_sent_at' => $now,
            'resend_count' => $window['count'],
            'resend_window_started_at' => $window['started_at'],
            'expires_at' => $now->copy()->addMinutes(self::CODE_TTL_MINUTES),
        ])->save();

        $this->sendCode($user, $existing->new_email, $code);

        return $existing->refresh();
    }

    /**
     * Verify `$code` against `$user`'s pending request. On success the
     * user's email is updated, email_verified_at is set, and the
     * request row is deleted. The whole thing runs inside a single
     * transaction so a unique-violation race between concurrent
     * registrations and the apply step can never leave the user in a
     * half-updated state.
     */
    public function verify(User $user, string $code): void
    {
        $request = EmailChangeRequest::query()->where('user_id', $user->id)->first();

        if ($request === null) {
            throw ValidationException::withMessages([
                'code' => 'No pending email change to verify.',
            ]);
        }

        if ($request->isExpired()) {
            $request->delete();
            throw ValidationException::withMessages([
                'code' => 'This code has expired. Request a new one.',
            ]);
        }

        if ($request->attempts >= self::MAX_VERIFY_ATTEMPTS) {
            $request->delete();
            throw ValidationException::withMessages([
                'code' => 'Too many incorrect attempts. Request a new code.',
            ]);
        }

        if (! Hash::check($code, $request->code_hash)) {
            $request->increment('attempts');
            throw ValidationException::withMessages([
                'code' => 'That code is incorrect.',
            ]);
        }

        DB::transaction(function () use ($user, $request) {
            // Race re-check: someone may have registered with this
            // address between request and verify.
            $this->assertEmailAvailable($request->new_email, $user->id);

            $user->forceFill([
                'email' => $request->new_email,
                'email_verified_at' => Carbon::now(),
            ])->save();

            $request->delete();
        });
    }

    public function cancel(User $user): void
    {
        EmailChangeRequest::query()->where('user_id', $user->id)->delete();
    }

    public function pendingFor(User $user): ?EmailChangeRequest
    {
        return EmailChangeRequest::query()->where('user_id', $user->id)->first();
    }

    private function assertEmailAvailable(string $email, int $excludeUserId): void
    {
        $taken = User::query()
            ->where('email', $email)
            ->where('id', '!=', $excludeUserId)
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages([
                'email' => 'This email is already in use by another account.',
            ]);
        }
    }

    private function guardResendRate(?EmailChangeRequest $existing): void
    {
        if ($existing === null) {
            return;
        }

        if ($existing->last_sent_at !== null) {
            $secondsSince = Carbon::now()->diffInSeconds($existing->last_sent_at, false);
            $waitFor = self::RESEND_COOLDOWN_SECONDS - abs((int) $secondsSince);
            if ($waitFor > 0) {
                throw ValidationException::withMessages([
                    'email' => "Please wait {$waitFor}s before requesting another code.",
                ]);
            }
        }

        if ($existing->resend_window_started_at !== null
            && $existing->resend_window_started_at
                ->copy()
                ->addMinutes(self::RESEND_WINDOW_MINUTES)
                ->isFuture()
            && $existing->resend_count >= self::MAX_RESENDS_PER_WINDOW
        ) {
            throw ValidationException::withMessages([
                'email' => 'Too many code requests. Try again later.',
            ]);
        }
    }

    /**
     * Compute the next resend_count / window_started_at pair. Resets
     * to count=1 when the previous window has rolled over; otherwise
     * increments the existing counter.
     *
     * @return array{count:int, started_at: Carbon}
     */
    private function openResendWindow(EmailChangeRequest $existing, Carbon $now): array
    {
        $windowOpen = $existing->resend_window_started_at !== null
            && $existing->resend_window_started_at
                ->copy()
                ->addMinutes(self::RESEND_WINDOW_MINUTES)
                ->isFuture();

        if ($windowOpen) {
            return [
                'count' => $existing->resend_count + 1,
                'started_at' => $existing->resend_window_started_at,
            ];
        }

        return ['count' => 1, 'started_at' => $now];
    }

    private function generateCode(): string
    {
        // 6 digits, zero-padded. random_int (via Str::random with a
        // numeric alphabet) keeps us on a CSPRNG instead of mt_rand.
        return str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Send the code to the *new* address via AnonymousNotifiable so
     * the recipient is the address the user is trying to claim, not
     * their current one. Queue routing follows the same admin
     * QueueSettingsResolver toggle the rest of our transactional
     * mail respects.
     */
    private function sendCode(User $user, string $newEmail, string $code): void
    {
        $notification = new EmailChangeCodeNotification(
            $code,
            self::CODE_TTL_MINUTES,
            $user->name ?? 'there',
        );

        
        $locale = $user->preferredLocale()
            ?? app(LocalizationService::class)->currentCode();
        $notification->locale($locale);

        $notifiable = (new \Illuminate\Notifications\AnonymousNotifiable)
            ->route('mail', $newEmail);

        if ($this->queue->isEmailQueueEnabled()) {
            if (method_exists($notification, 'onConnection')) {
                $notification->onConnection($this->queue->resolvedConnection());
            }
            if (method_exists($notification, 'onQueue')) {
                $notification->onQueue($this->queue->emailQueueName());
            }
            $notifiable->notify($notification);

            return;
        }

        $notifiable->notifyNow($notification);
    }

    public static function isVerificationRequired(): bool
    {
        return app(\App\Services\Settings\GeneralSettings::class)->requiresEmailVerification();
    }
}

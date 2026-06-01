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

namespace App\Models;

use App\Notifications\Auth\ResetPasswordNotification;
use App\Notifications\Auth\VerifyEmailNotification;
use App\Services\Queue\QueueSettingsResolver;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

#[Fillable([
    'name',
    'email',
    'password',
    'is_admin',
    'is_active',
    'locale',
    'theme',
    'avatar',
    'subscription_plan_id',
    'previous_paid_plan_id',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasFactory, Notifiable;

    /**
     * Locale Laravel's notification dispatcher will switch to before
     * invoking toMail() — covers the queued path where the worker has
     * no session to fall back on. Returns null when the user has
     * never picked a language (Laravel then leaves the app locale
     * alone, and our LocalizationService falls through to the
     * admin-configured default).
     */
    public function preferredLocale(): ?string
    {
        $locale = $this->locale;

        return is_string($locale) && $locale !== '' ? $locale : null;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'trial_ends_at' => 'datetime',
        ];
    }

    public function isAdmin(): bool
    {
        return (bool) $this->is_admin;
    }

    /**
     * Fallback redirect after login, email verification, or password
     * confirmation when Laravel has no `url.intended` session value.
     */
    public function postAuthenticationRedirectUrl(): string
    {
        return $this->isAdmin()
            ? route('admin.dashboard', absolute: false)
            : route('app.dashboard', absolute: false);
    }

    /**
     * An "inactive" user is one the admin has disabled in the Users
     * pane. They are blocked at login and force-logged-out by
     * EnsureUserIsActive on any subsequent authenticated request.
     */
    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }

    /** @return BelongsTo<SubscriptionPlan, $this> */
    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class);
    }

    /** @return BelongsTo<SubscriptionPlan, $this> */
    public function previousPaidPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'previous_paid_plan_id');
    }

    /** @return HasOne<UserCreditBalance, $this> */
    public function creditBalance(): HasOne
    {
        return $this->hasOne(UserCreditBalance::class);
    }

    /** @return HasMany<UserCreditDailyUsage, $this> */
    public function creditDailyUsages(): HasMany
    {
        return $this->hasMany(UserCreditDailyUsage::class);
    }

    /** @return HasMany<Course, $this> */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    /** @return HasMany<QuickLearn, $this> */
    public function quickLearns(): HasMany
    {
        return $this->hasMany(QuickLearn::class);
    }

    /** @return HasMany<Quiz, $this> */
    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class);
    }

    /** @return HasMany<CourseCertificate, $this> */
    public function certificates(): HasMany
    {
        return $this->hasMany(CourseCertificate::class);
    }

    /** @return HasMany<AiTokenUsage, $this> */
    public function aiTokenUsages(): HasMany
    {
        return $this->hasMany(AiTokenUsage::class);
    }

    /**
     * Send the password-reset notification, choosing queued vs sync
     * delivery based on the admin-managed queue settings.
     *
     * - Queue ON  + email-sending job ON → notify() (ShouldQueue routes
     *   it through the configured connection on the `emails` queue).
     * - Otherwise → notifyNow() (sync, bypasses the queue entirely so
     *   resets still work even without a worker).
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $notification = new ResetPasswordNotification($token);

        $this->dispatchTransactionalMail($notification);
    }

    /**
     * Send the email-verification notification with the same conditional
     * routing as the password-reset notification above.
     */
    public function sendEmailVerificationNotification(): void
    {
        $notification = new VerifyEmailNotification;

        $this->dispatchTransactionalMail($notification);
    }

    /**
     * Shared dispatch helper: resolves the QueueSettingsResolver from
     * the container so model code stays test-friendly, then sends the
     * notification either synchronously or via the configured queue.
     */
    private function dispatchTransactionalMail(object $notification): void
    {
        $queue = app(QueueSettingsResolver::class);

        if ($queue->isEmailQueueEnabled()) {
            if (method_exists($notification, 'onConnection')) {
                $notification->onConnection($queue->resolvedConnection());
            }
            if (method_exists($notification, 'onQueue')) {
                $notification->onQueue($queue->emailQueueName());
            }

            $this->notify($notification);

            return;
        }

        // Sync fallback: notifyNow ignores ShouldQueue and dispatches
        // through the listener immediately on the request thread.
        $this->notifyNow($notification);
    }
}

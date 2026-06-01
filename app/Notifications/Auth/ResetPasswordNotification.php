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

namespace App\Notifications\Auth;

use Illuminate\Auth\Notifications\ResetPassword as FrameworkResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Password reset notification with conditional queueing.
 *
 * Implements ShouldQueue so it CAN be queued, but the actual queue vs
 * sync decision is made in User::sendPasswordResetNotification by
 * picking either notifyNow() (sync, always) or notify() (queues
 * because of this ShouldQueue contract).
 *
 * When dispatched via notify(), the User override also calls
 * onConnection() / onQueue() to route the job to the queue and
 * connection the admin selected in the Queue Settings page.
 *
 * Body content mirrors Laravel's stock reset password template
 * verbatim, but every line goes through our t() helper so admins
 * can override copy per locale from the Localization page.
 */
class ResetPasswordNotification extends FrameworkResetPassword implements ShouldQueue
{
    use Queueable;

    /**
     * @param  mixed  $notifiable
     */
    public function toMail($notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);

        $minutes = (int) config(
            'auth.passwords.'.config('auth.defaults.passwords').'.expire',
            60,
        );

        return (new MailMessage)
            ->subject(t('emails.password_reset.subject', 'Reset your password'))
            ->line(t(
                'emails.password_reset.line_intro',
                'You are receiving this email because we received a password reset request for your account.',
            ))
            ->action(
                t('emails.password_reset.action', 'Reset Password'),
                $url,
            )
            ->line(t(
                'emails.password_reset.line_expiry',
                'This password reset link will expire in {count} minutes.',
                ['count' => $minutes],
            ))
            ->line(t(
                'emails.password_reset.line_fallback',
                'If you did not request a password reset, no further action is required.',
            ));
    }
}

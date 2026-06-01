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

use Illuminate\Auth\Notifications\VerifyEmail as FrameworkVerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Email-verification notification with conditional queueing.
 *
 * Same pattern as ResetPasswordNotification: this class declares the
 * ShouldQueue contract so it CAN be queued, but User overrides choose
 * notifyNow() (sync) vs notify() (queued) at dispatch time based on
 * the admin-managed QueueSettingsResolver state.
 *
 * Body content mirrors Laravel's stock verify-email template
 * verbatim, but every line goes through our t() helper so admins
 * can override copy per locale from the Localization page.
 */
class VerifyEmailNotification extends FrameworkVerifyEmail implements ShouldQueue
{
    use Queueable;

    /**
     * @param  mixed  $notifiable
     */
    public function toMail($notifiable): MailMessage
    {
        $url = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject(t('emails.verify_email.subject', 'Verify your email address'))
            ->line(t(
                'emails.verify_email.line_intro',
                'Please click the button below to verify your email address.',
            ))
            ->action(
                t('emails.verify_email.action', 'Verify Email Address'),
                $url,
            )
            ->line(t(
                'emails.verify_email.line_fallback',
                'If you did not create an account, no further action is required.',
            ));
    }
}

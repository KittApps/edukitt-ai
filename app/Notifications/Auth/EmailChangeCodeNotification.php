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

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * 6-digit code mailed to a *new* email address while the user proves
 * ownership of it. Implements ShouldQueue so it can ride the email
 * queue when enabled, but {@see \App\Services\Auth\EmailChangeService}
 * dispatches it via notifyNow / notify based on QueueSettingsResolver
 * — matching how the rest of our transactional mail behaves.
 */
class EmailChangeCodeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $code,
        private readonly int $ttlMinutes,
        private readonly string $recipientName,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(t('emails.email_change.subject', 'Confirm your new email address'))
            ->greeting(t(
                'emails.email_change.greeting',
                'Hi {name},',
                ['name' => $this->recipientName],
            ))
            ->line(t(
                'emails.email_change.line_intro',
                'Use the code below to confirm this email address on your account.',
            ))
            // Surrounding ** keeps the markdown bold styling the stock
            // notification layout already understands; the code itself
            // is dynamic data, not translatable copy.
            ->line('**'.$this->code.'**')
            ->line(t(
                'emails.email_change.line_expiry',
                'This code expires in {count} minutes.',
                ['count' => $this->ttlMinutes],
            ))
            ->line(t(
                'emails.email_change.line_fallback',
                "If you didn't request this change, you can safely ignore this email.",
            ));
    }
}

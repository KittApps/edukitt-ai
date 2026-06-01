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

namespace App\Notifications\Admin;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContactFormNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $senderName,
        public readonly string $senderEmail,
        public readonly string $subjectLine,
        public readonly string $message,
        public readonly ?string $ip = null,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('[Contact form] '.$this->subjectLine)
            ->replyTo($this->senderEmail, $this->senderName)
            ->greeting('New contact form submission')
            ->line('From: '.$this->senderName.' <'.$this->senderEmail.'>')
            ->line('Subject: '.$this->subjectLine);

        if ($this->ip !== null && $this->ip !== '') {
            $mail->line('IP: '.$this->ip);
        }

        foreach (preg_split('/\r\n|\r|\n/', $this->message) ?: [] as $paragraph) {
            $paragraph = trim($paragraph);
            if ($paragraph !== '') {
                $mail->line($paragraph);
            }
        }

        return $mail->line('— Reply directly to this email to respond to '.$this->senderName.'.');
    }
}

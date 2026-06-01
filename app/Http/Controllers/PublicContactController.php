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

use App\Notifications\Admin\ContactFormNotification;
use App\Rules\Recaptcha;
use App\Services\Queue\QueueSettingsResolver;
use App\Services\Settings\ContactSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\AnonymousNotifiable;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PublicContactController extends Controller
{
    public function __construct(
        private readonly ContactSettings $settings,
        private readonly QueueSettingsResolver $queue,
    ) {}

    public function show(): Response
    {
        $this->ensureEnabled();

        return Inertia::render('Public/Contact');
    }

    public function submit(Request $request): RedirectResponse
    {
        $this->ensureEnabled();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
            // Honeypot: real users leave this empty; bots fill every field.
            'website' => ['nullable', 'size:0'],
            'recaptcha_token' => [new Recaptcha($request->ip())],
        ], [
            'website.size' => 'Invalid submission.',
        ]);

        $recipient = $this->settings->effectiveRecipient();
        if ($recipient === null) {
            return back()
                ->withErrors(['email' => 'Contact form is not yet configured. Please try again later.'])
                ->withInput();
        }

        $notification = new ContactFormNotification(
            senderName: $data['name'],
            senderEmail: $data['email'],
            subjectLine: $data['subject'],
            message: $data['message'],
            ip: $request->ip(),
        );

        $notifiable = (new AnonymousNotifiable)->route('mail', $recipient);

        if ($this->queue->isEmailQueueEnabled()) {
            $notification->onConnection($this->queue->resolvedConnection());
            $notification->onQueue($this->queue->emailQueueName());
            $notifiable->notify($notification);
        } else {
            $notifiable->notifyNow($notification);
        }

        return back()->with('contact_status', 'sent');
    }

    private function ensureEnabled(): void
    {
        if (! $this->settings->isEnabled()) {
            throw new NotFoundHttpException();
        }
    }
}

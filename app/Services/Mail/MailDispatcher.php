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

namespace App\Services\Mail;

use App\Services\Queue\QueueSettingsResolver;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

/**
 * Single hook point for all application-side mail sending.
 *
 * The dispatcher inspects QueueSettingsResolver before every send and
 * decides whether to queue the message (driver + queue name resolved
 * from the admin UI) or to deliver it synchronously through the
 * regular SMTP transport.
 *
 * This keeps the "is the queue on?" decision in one place — callers
 * never have to repeat that check or know which connection they should
 * be hitting.
 */
class MailDispatcher
{
    public function __construct(private readonly QueueSettingsResolver $queue) {}

    /**
     * Send a Mailable to one explicit recipient, choosing sync vs queued
     * based on the live admin settings. When the recipient is omitted
     * the Mailable's built-in `to`/`cc`/`bcc` envelope is used.
     */
    public function send(Mailable $mailable, mixed $to = null): void
    {
        $pending = $to !== null ? Mail::to($to) : null;

        if ($this->queue->isEmailQueueEnabled()) {
            $this->configureQueued($mailable);
            $pending !== null
                ? $pending->queue($mailable)
                : Mail::queue($mailable);

            return;
        }

        $pending !== null
            ? $pending->send($mailable)
            : Mail::send($mailable);
    }

    /**
     * Always-synchronous raw-text send. Used by admin tooling (the Test
     * Email button) so the operator gets immediate success/failure
     * feedback regardless of the queue toggle.
     */
    public function raw(string $text, callable $configure): void
    {
        Mail::raw($text, $configure);
    }

    /**
     * Force-sync send of a Mailable, bypassing the queue regardless of
     * the admin toggle. Reserved for admin diagnostic flows.
     */
    public function sendNow(Mailable $mailable, mixed $to = null): void
    {
        $to !== null
            ? Mail::to($to)->send($mailable)
            : Mail::send($mailable);
    }

    /**
     * Whether the next `send()` call would be queued, exposed so
     * callers can adjust UX (e.g. show "Queued" vs "Sent" in the UI).
     */
    public function willQueue(): bool
    {
        return $this->queue->isEmailQueueEnabled();
    }

    /**
     * Apply the connection + queue name to a Mailable in-place.
     *
     * `Illuminate\Mail\Mailable` exposes public `$connection` and
     * `$queue` properties that `SendQueuedMailable` reads when the
     * job is pushed, so writing to them is the supported way to route
     * an outgoing mail onto a specific connection/queue. We mutate
     * the Mailable rather than wrapping it so any per-class overrides
     * set inside the Mailable itself are intentionally replaced by
     * the admin-configured defaults.
     */
    private function configureQueued(Mailable $mailable): void
    {
        // Concrete Mailable instances expose these public properties;
        // anything that only satisfies the contract still works (we
        // just skip the override and let the framework fall back to
        // the default connection / queue).
        if (property_exists($mailable, 'connection')) {
            $mailable->connection = $this->queue->resolvedConnection();
        }
        if (property_exists($mailable, 'queue')) {
            $mailable->queue = $this->queue->emailQueueName();
        }
    }
}

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

namespace App\Console\Commands;

use App\Services\Billing\StripeSettingsResolver;
use App\Services\Billing\SubscriptionService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Subscription;

/**
 * Safety net for missed/failed Stripe webhooks.
 *
 * For every active local Cashier subscription whose current_period_end
 * has passed and no renewal arrived, ask Stripe directly what state it
 * is in and align our side. If Stripe reports the sub as canceled /
 * past_due / unpaid we downgrade the user to the free plan.
 *
 * Idempotent: subscriptions that have already been reconciled either
 * because Stripe sent a delayed webhook or a previous run handled
 * them are left untouched.
 */
class ReconcileSubscriptions extends Command
{
    protected $signature = 'subscriptions:reconcile
        {--batch=100 : Number of subscriptions to process per chunk.}';

    protected $description = 'Reconcile local Cashier subscriptions against Stripe to catch missed webhooks.';

    public function handle(SubscriptionService $subscriptions, StripeSettingsResolver $stripeSettings): int
    {
        if (! $stripeSettings->isConfigured()) {
            $this->warn('Stripe is not configured yet — nothing to reconcile.');

            return self::SUCCESS;
        }

        $client = Cashier::stripe();
        $now = CarbonImmutable::now();

        $reconciled = 0;
        $checked = 0;

        Subscription::query()
            ->where(function ($q) {
                $q->where('stripe_status', 'active')
                    ->orWhere('stripe_status', 'past_due');
            })
            ->with('owner')
            ->chunkById((int) $this->option('batch'), function ($subs) use (&$checked, &$reconciled, $client, $subscriptions) {
                foreach ($subs as $sub) {
                    $checked++;
                    try {
                        $stripeSub = $client->subscriptions->retrieve($sub->stripe_id);
                    } catch (\Throwable $e) {
                        $this->warn("  → could not fetch {$sub->stripe_id}: {$e->getMessage()}");

                        continue;
                    }

                    $endTs = $stripeSub->current_period_end ?? null;
                    $endsAt = $endTs ? CarbonImmutable::createFromTimestamp($endTs) : null;

                    // Sub still mid-period on Stripe — nothing to do.
                    if ($endsAt !== null && $endsAt->isFuture()) {
                        continue;
                    }

                    $sub->stripe_status = $stripeSub->status;
                    $sub->save();

                    if (in_array($stripeSub->status, ['canceled', 'unpaid', 'incomplete_expired'], true)) {
                        $owner = $sub->owner;
                        if ($owner !== null) {
                            $subscriptions->downgradeToFreePlan($owner);
                            $reconciled++;
                            $this->info("Downgraded user {$owner->id} (sub {$sub->stripe_id}) — Stripe status {$stripeSub->status}");
                        }
                    }
                }
            });

        $this->info("Checked {$checked} subscriptions, reconciled {$reconciled}.");
        $this->line("Run at {$now->toIso8601String()}.");

        return self::SUCCESS;
    }
}

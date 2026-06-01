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

use App\Models\User;
use App\Services\Billing\CreditService;
use Illuminate\Console\Command;

/**
 * Daily cron entry point for free-plan credit renewal.
 *
 * Mirrors the lazy renewal that AuthenticatedSessionController triggers
 * on login, but covers users who haven't logged in recently. Both
 * paths are idempotent — a user logging in moments after this command
 * has refreshed their balance produces a no-op.
 *
 * Only free plans need this because paid plans are renewed by Stripe
 * webhooks (invoice.payment_succeeded). The command still iterates
 * paid users so that any orphans without an active Stripe sub get a
 * sane refresh anchor.
 */
class RenewFreePlanCredits extends Command
{
    protected $signature = 'credits:renew-free-plans
        {--batch=200 : Number of users to process per chunk.}';

    protected $description = 'Renew expired free-plan credit periods for users who have not logged in.';

    public function handle(CreditService $credits): int
    {
        $renewed = 0;
        $checked = 0;

        User::query()
            ->whereNotNull('subscription_plan_id')
            ->with('subscriptionPlan', 'creditBalance')
            ->chunkById((int) $this->option('batch'), function ($users) use (&$renewed, &$checked, $credits) {
                foreach ($users as $user) {
                    $checked++;
                    if ($credits->renewIfPeriodElapsed($user)) {
                        $renewed++;
                    }
                }
            });

        $this->info("Checked {$checked} users, renewed {$renewed}.");

        return self::SUCCESS;
    }
}

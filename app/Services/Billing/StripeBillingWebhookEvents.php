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

namespace App\Services\Billing;

/**
 * Stripe event types handled by {@see \App\Listeners\Billing\HandleStripeWebhooks}.
 * Configure the same events (or “Send all events”) on the webhook endpoint
 * in the Stripe Dashboard so subscriptions, renewals and credit packs sync.
 */
final class StripeBillingWebhookEvents
{
    /**
     * Checklist for Admin → Settings → Billings → Stripe.
     *
     * @return list<array{type: string, description: string}>
     */
    public static function adminChecklist(): array
    {
        return [
            [
                'type' => 'customer.subscription.created',
                'description' => 'Links a new subscription to the matching plan and grants plan credits when the user upgrades or subscribes.',
            ],
            [
                'type' => 'customer.subscription.updated',
                'description' => 'Keeps local `subscription_plan_id` and credits in sync after upgrades, downgrades, or billing-cycle changes.',
            ],
            [
                'type' => 'customer.subscription.deleted',
                'description' => 'Downgrades the user to the free plan when the subscription is canceled or expires.',
            ],
            [
                'type' => 'invoice.paid',
                'description' => 'Used for subscription renewals (`billing_reason` = `subscription_cycle`) to refill plan credits each period.',
            ],
            [
                'type' => 'invoice.payment_succeeded',
                'description' => 'Same renewal handling as `invoice.paid` (Stripe may emit one or both).',
            ],
            [
                'type' => 'checkout.session.completed',
                'description' => 'Records one-off credit pack purchases when Checkout metadata includes `credit_package_id`.',
            ],
        ];
    }
}

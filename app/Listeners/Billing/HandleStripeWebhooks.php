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

namespace App\Listeners\Billing;

use App\Models\CreditPackage;
use App\Models\CreditPackPurchase;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Billing\CreditService;
use App\Services\Billing\SubscriptionService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Reacts to Stripe webhook events that Cashier surfaces via the
 * WebhookReceived application event. Cashier owns its own
 * `subscriptions` table writes; this listener owns the App-side
 * `users.subscription_plan_id` reference, `user_credit_balances`
 * top-ups / renewals, and `credit_pack_purchases` ledger rows.
 *
 * Event types surfaced in Admin → Billing → Stripe must stay aligned
 * with {@see StripeBillingWebhookEvents::adminChecklist()}.
 */
class HandleStripeWebhooks
{
    public function __construct(
        private readonly CreditService $credits,
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function handle(WebhookReceived $event): void
    {
        $type = $event->payload['type'] ?? null;
        $id = $event->payload['id'] ?? null;
        $data = $event->payload['data']['object'] ?? [];

        // TEMP: verification log so the user can confirm events are reaching
        // the listener via `tail -f storage/logs/laravel.log`.
        Log::info('[billing] stripe webhook', ['event' => $type, 'id' => $id]);

        try {
            match ($type) {
                'customer.subscription.created',
                'customer.subscription.updated' => $this->onSubscriptionCreatedOrUpdated($data),
                'customer.subscription.deleted' => $this->onSubscriptionDeleted($data),
                'invoice.paid',
                'invoice.payment_succeeded' => $this->onInvoicePaid($data),
                'checkout.session.completed' => $this->onCheckoutCompleted($data),
                default => null,
            };
        } catch (\Throwable $e) {
            Log::warning('[billing] failed to process Stripe webhook', [
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Look up the application user by Stripe customer id.
     */
    private function findUser(?string $stripeId): ?User
    {
        if (! $stripeId) {
            return null;
        }

        return User::query()->where('stripe_id', $stripeId)->first();
    }

    private function findPlanByPriceId(?string $priceId): ?SubscriptionPlan
    {
        if (! $priceId) {
            return null;
        }

        return SubscriptionPlan::query()
            ->where('stripe_monthly_price_id', $priceId)
            ->orWhere('stripe_yearly_price_id', $priceId)
            ->first();
    }

    /**
     * Shared handler for `customer.subscription.created` / `.updated`.
     * Routes through `applyManualPlanChange` so the credit-bucket math
     * (additive on upgrade, replace on downgrade) matches the admin
     * manual-override path. Idempotent on `subscription_plan_id` —
     * webhook replays, no-op status flips, and monthly↔yearly cycle
     * swaps on the same plan all short-circuit here.
     */
    private function onSubscriptionCreatedOrUpdated(array $sub): void
    {
        $user = $this->findUser($sub['customer'] ?? null);
        if ($user === null) {
            return;
        }

        $priceId = $sub['items']['data'][0]['price']['id'] ?? null;
        $plan = $this->findPlanByPriceId($priceId);
        if ($plan === null) {
            return;
        }

        if ($user->subscription_plan_id === $plan->id) {
            return;
        }

        $this->subscriptions->applyManualPlanChange($user, $plan);
    }

    private function onSubscriptionDeleted(array $sub): void
    {
        $user = $this->findUser($sub['customer'] ?? null);
        if ($user === null) {
            return;
        }

        $this->subscriptions->downgradeToFreePlan($user);
    }

    /**
     * Renewal handler. Gated on `billing_reason === 'subscription_cycle'`
     * so the initial `subscription_create` invoice (whose credits are
     * already granted by `customer.subscription.created`) and mid-cycle
     * proration invoices don't double-credit or wipe usage. Idempotent
     * against retries via the `period_starts_at` already stored on the
     * balance row.
     */
    private function onInvoicePaid(array $invoice): void
    {
        if (($invoice['billing_reason'] ?? null) !== 'subscription_cycle') {
            return;
        }

        if (empty($invoice['subscription'])) {
            return;
        }

        $user = $this->findUser($invoice['customer'] ?? null);
        if ($user === null) {
            return;
        }

        $priceId = $invoice['lines']['data'][0]['price']['id'] ?? null;
        $plan = $this->findPlanByPriceId($priceId) ?? $user->subscriptionPlan;
        if ($plan === null) {
            return;
        }

        $periodStart = isset($invoice['period_start'])
            ? CarbonImmutable::createFromTimestamp((int) $invoice['period_start'])
            : null;
        $periodEnd = isset($invoice['period_end'])
            ? CarbonImmutable::createFromTimestamp((int) $invoice['period_end'])
            : null;

        if ($periodStart !== null) {
            $existingStart = $this->credits->getOrCreateBalance($user)->period_starts_at;
            if ($existingStart !== null
                && CarbonImmutable::instance($existingStart)->equalTo($periodStart)) {
                return;
            }
        }

        $this->credits->renewPlanCredits($user, $plan, $periodStart, $periodEnd);
    }

    private function onCheckoutCompleted(array $session): void
    {
        // Credit-pack checkouts attach the package id via metadata.
        $packageId = $session['metadata']['credit_package_id'] ?? null;
        if (! $packageId) {
            return;
        }

        $user = $this->findUser($session['customer'] ?? null);
        if ($user === null) {
            return;
        }

        $package = CreditPackage::query()->find((int) $packageId);
        if ($package === null) {
            return;
        }

        $sessionId = $session['id'] ?? null;
        if ($sessionId === null) {
            return;
        }

        // Idempotent: webhook retries hit the same session id and the
        // unique constraint short-circuits the second write.
        $existing = CreditPackPurchase::query()
            ->where('stripe_session_id', $sessionId)
            ->first();
        if ($existing !== null) {
            return;
        }

        $amountCents = (int) ($session['amount_total']
            ?? $package->price_cents
            ?? 0);
        $currency = strtoupper((string) (
            $session['currency']
            ?? $package->currency
            ?? 'USD'
        ));

        CreditPackPurchase::create([
            'user_id' => $user->id,
            'credit_package_id' => $package->id,
            'credits' => $package->credits,
            'amount_cents' => $amountCents,
            'currency' => $currency,
            'stripe_session_id' => $sessionId,
            'stripe_payment_intent_id' => $session['payment_intent'] ?? null,
            'status' => 'completed',
        ]);

        $this->credits->addPurchasedCredits($user, $package->credits);
    }
}

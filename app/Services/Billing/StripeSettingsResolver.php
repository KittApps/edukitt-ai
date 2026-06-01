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

use App\Models\Setting;
use App\Services\Settings\SecretSetting;
use Illuminate\Support\Facades\Config;

/**
 * Push admin-managed Stripe keys from the `settings` table into the
 * runtime `services.stripe.*` config so Cashier picks them up at boot.
 *
 * Keeping the keys in the database (rather than .env) lets operators
 * manage Stripe credentials through the admin UI; .env values are
 * still respected when nothing has been saved through the UI.
 */
class StripeSettingsResolver
{
    public const SETTINGS_GROUP = 'billing';

    public const KEY_PUBLISHABLE = 'stripe_publishable_key';

    public const KEY_SECRET = 'stripe_secret_key';

    public const KEY_WEBHOOK_SECRET = 'stripe_webhook_secret';

    public const KEY_CURRENCY = 'stripe_currency';

    /**
     * Apply DB-stored Stripe credentials to the runtime config.
     *
     * Safe to call during boot — silently skips if the settings
     * table is not available yet (early install / migrate phase).
     */
    public function applyToConfig(): void
    {
        try {
            $key = Setting::get(self::SETTINGS_GROUP, self::KEY_PUBLISHABLE);
            // Secrets are stored encrypted via SecretSetting; the helper
            // also auto-upgrades any legacy plaintext rows on first read.
            $secret = SecretSetting::get(self::SETTINGS_GROUP, self::KEY_SECRET);
            $webhook = SecretSetting::get(self::SETTINGS_GROUP, self::KEY_WEBHOOK_SECRET);
            $currency = Setting::get(self::SETTINGS_GROUP, self::KEY_CURRENCY);
        } catch (\Throwable) {
            return;
        }

        if (! empty($key)) {
            Config::set('cashier.key', $key);
            Config::set('services.stripe.key', $key);
        }

        if (! empty($secret)) {
            Config::set('cashier.secret', $secret);
            Config::set('services.stripe.secret', $secret);
        }

        if (! empty($webhook)) {
            Config::set('cashier.webhook.secret', $webhook);
            Config::set('services.stripe.webhook.secret', $webhook);
        }

        if (! empty($currency)) {
            Config::set('cashier.currency', strtolower($currency));
        }
    }

    /** @return array{publishable: ?string, secret: ?string, webhook: ?string, currency: string} */
    public function snapshot(): array
    {
        return [
            'publishable' => Setting::get(self::SETTINGS_GROUP, self::KEY_PUBLISHABLE),
            'secret' => SecretSetting::get(self::SETTINGS_GROUP, self::KEY_SECRET),
            'webhook' => SecretSetting::get(self::SETTINGS_GROUP, self::KEY_WEBHOOK_SECRET),
            'currency' => (string) (Setting::get(self::SETTINGS_GROUP, self::KEY_CURRENCY) ?? 'USD'),
        ];
    }

    public function isConfigured(): bool
    {
        // Use raw existence checks so we don't pay the decrypt cost
        // just to answer "is it set?".
        return SecretSetting::has(self::SETTINGS_GROUP, self::KEY_SECRET)
            && ! empty(Setting::get(self::SETTINGS_GROUP, self::KEY_PUBLISHABLE));
    }
}

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

namespace App\Http\Controllers\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\Billing\CreditPricingService;
use App\Services\Billing\StripeBillingWebhookEvents;
use App\Services\Billing\StripeSettingsResolver;
use App\Services\Settings\CurrencySettings;
use App\Services\Settings\SecretSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin → Settings → Billings.
 *
 * Three tabs:
 *   - Credits: credit unit price (USD per 1 credit) + master toggle
 *     that disables the credits subsystem entirely.
 *   - Currency: display-only currency (code + symbol) used across
 *     pricing surfaces. Independent of Stripe charge currency.
 *   - Stripe: publishable key, secret key, webhook secret, default
 *     currency. Secrets are masked when rendered back to the UI.
 *
 * All values are persisted via the existing key/value Setting store
 * under the `billing` group. The StripeSettingsResolver picks them
 * up at boot time and overrides the runtime services config.
 */
class BillingController extends Controller
{
    private const GROUP = CreditPricingService::SETTINGS_GROUP;

    public function index(CurrencySettings $currency): Response
    {
        return Inertia::render('Admin/Settings/Billings', [
            'credits' => [
                'credit_rate_usd' => (float) (Setting::get(
                    self::GROUP,
                    CreditPricingService::KEY_CREDIT_RATE_USD,
                ) ?? CreditPricingService::DEFAULT_RATE_USD),
                'credits_enabled' => Setting::get(
                    self::GROUP,
                    CreditPricingService::KEY_CREDITS_ENABLED,
                ) ?? true,
            ],
            'currency' => $currency->snapshot(),
            'stripe' => [
                'publishable' => Setting::get(self::GROUP, StripeSettingsResolver::KEY_PUBLISHABLE),
                // `has()` only checks for a non-empty row; we never
                // surface the actual secret value to the browser.
                'secret_set' => SecretSetting::has(self::GROUP, StripeSettingsResolver::KEY_SECRET),
                'webhook_set' => SecretSetting::has(self::GROUP, StripeSettingsResolver::KEY_WEBHOOK_SECRET),
                'currency' => Setting::get(self::GROUP, StripeSettingsResolver::KEY_CURRENCY) ?? 'USD',
                // Absolute URL the operator must paste into the Stripe
                // Dashboard → Developers → Webhooks. Resolved from the
                // `cashier.webhook` route so it stays in sync with the
                // package's actual handler path (defaults to
                // `/stripe/webhook` under APP_URL).
                'webhook_url' => route('cashier.webhook'),
                'webhook_events' => StripeBillingWebhookEvents::adminChecklist(),
            ],
        ]);
    }

    public function updateCredits(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'credit_rate_usd' => 'required|numeric|min:0.000001|max:1000',
            'credits_enabled' => 'required|boolean',
        ]);

        Setting::set(self::GROUP, CreditPricingService::KEY_CREDIT_RATE_USD, $data['credit_rate_usd']);
        Setting::set(self::GROUP, CreditPricingService::KEY_CREDITS_ENABLED, $data['credits_enabled']);

        return back()->with('success', 'Credit settings updated.');
    }

    public function updateCurrency(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:10',
            'symbol' => 'required|string|max:8',
        ]);

        Setting::set(self::GROUP, CurrencySettings::KEY_CODE, strtoupper(trim($data['code'])));
        Setting::set(self::GROUP, CurrencySettings::KEY_SYMBOL, trim($data['symbol']));

        return back()->with('success', 'Currency updated.');
    }

    public function updateStripe(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'publishable' => 'nullable|string|max:255',
            'secret' => 'nullable|string|max:255',
            'webhook' => 'nullable|string|max:255',
            'currency' => 'required|string|size:3',
        ]);

       
        Setting::set(self::GROUP, StripeSettingsResolver::KEY_PUBLISHABLE, $data['publishable']);

        // Secret/webhook are write-only from the UI — the form never
        // shows the current value. An empty submit therefore means
        // "leave unchanged" rather than "clear", letting the operator
        // update one field at a time without re-typing the rest.
        // Real values land in the DB encrypted at rest via SecretSetting.
        if (! empty($data['secret'])) {
            SecretSetting::set(self::GROUP, StripeSettingsResolver::KEY_SECRET, $data['secret']);
        }
        if (! empty($data['webhook'])) {
            SecretSetting::set(self::GROUP, StripeSettingsResolver::KEY_WEBHOOK_SECRET, $data['webhook']);
        }

        Setting::set(self::GROUP, StripeSettingsResolver::KEY_CURRENCY, strtoupper($data['currency']));

        return back()->with('success', 'Stripe settings updated.');
    }
}

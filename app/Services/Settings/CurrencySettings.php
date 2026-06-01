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

namespace App\Services\Settings;

use App\Models\Setting;
use App\Services\Billing\StripeSettingsResolver;
use Throwable;

/**
 * Display-only currency for prices shown across admin and user
 * surfaces (subscription plans, transactions, credit packs).
 *
 * Stored under the existing `billing` group so all billing-related
 * keys live together. Does NOT touch Stripe / Cashier currency —
 * Stripe charges in its own configured currency.
 */
class CurrencySettings
{
    public const GROUP = StripeSettingsResolver::SETTINGS_GROUP;

    public const KEY_CODE = 'display_currency_code';

    public const KEY_SYMBOL = 'display_currency_symbol';

    public const DEFAULT_CODE = 'USD';

    public const DEFAULT_SYMBOL = '$';

    public function code(): string
    {
        $value = $this->get(self::KEY_CODE, self::DEFAULT_CODE);

        return is_string($value) && $value !== '' ? $value : self::DEFAULT_CODE;
    }

    public function symbol(): string
    {
        $value = $this->get(self::KEY_SYMBOL, self::DEFAULT_SYMBOL);

        return is_string($value) && $value !== '' ? $value : self::DEFAULT_SYMBOL;
    }

    /** @return array{code: string, symbol: string} */
    public function snapshot(): array
    {
        return [
            'code' => $this->code(),
            'symbol' => $this->symbol(),
        ];
    }

    /** @return array{code: string, symbol: string} */
    public function publicSnapshot(): array
    {
        return $this->snapshot();
    }

    /**
     * Format a number with the configured symbol prefix. Used by
     * server-rendered surfaces that need a human-readable price (the
     * frontend has its own equivalent in `lib/settings.ts`).
     */
    public function format(float|int $value, int $fractionDigits = 2): string
    {
        return $this->symbol().number_format((float) $value, $fractionDigits);
    }

    private function get(string $key, mixed $default = null): mixed
    {
        try {
            return Setting::get(self::GROUP, $key, $default);
        } catch (Throwable) {
            return $default;
        }
    }
}

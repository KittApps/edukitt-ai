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

/**
 * Converts the USD cost of an AI call into credits.
 *
 * The admin configures a single `credit_rate_usd` in
 * `settings → billings → credits` representing how many USD one
 * credit is worth. We round UP so the user never gets charged a
 * fractional credit they didn't actually use, and to absorb the
 * tiny tracking errors from the per-million pricing snapshots.
 *
 * Also exposes a feature toggle so the entire credits system can
 * be disabled by an operator who only wants feature limits.
 */
class CreditPricingService
{
    public const SETTINGS_GROUP = 'billing';

    public const KEY_CREDIT_RATE_USD = 'credit_rate_usd';

    public const KEY_CREDITS_ENABLED = 'credits_enabled';

    public const DEFAULT_RATE_USD = 0.002; // 1 credit ≈ $0.002

    public function rate(): float
    {
        $raw = Setting::get(self::SETTINGS_GROUP, self::KEY_CREDIT_RATE_USD);
        $value = $raw === null ? self::DEFAULT_RATE_USD : (float) $raw;

        return $value > 0 ? $value : self::DEFAULT_RATE_USD;
    }

    public function creditsEnabled(): bool
    {
        $raw = Setting::get(self::SETTINGS_GROUP, self::KEY_CREDITS_ENABLED);

        // Default ON so a fresh install with no row behaves as documented.
        return $raw === null ? true : (bool) $raw;
    }

    /**
     * Convert a USD cost to a whole number of credits, rounded up.
     * A zero cost still consumes 1 credit when the provider returned
     * any tokens at all — fairness preserved without rewarding free runs.
     */
    public function creditsFor(float $costUsd): int
    {
        if ($costUsd <= 0) {
            return 1;
        }

        $credits = (int) ceil($costUsd / $this->rate());

        return max(1, $credits);
    }

    /**
     * Conservative pre-check estimate. We assume a relatively cheap
     * upper-bound for the response so we can guarantee the user has
     * enough credits before incurring provider cost. The post-charge
     * step reconciles using the actual usage.
     */
    public function estimateCreditsFor(float $inputCostUsd, float $expectedOutputCostUsd): int
    {
        return $this->creditsFor($inputCostUsd + $expectedOutputCostUsd);
    }
}

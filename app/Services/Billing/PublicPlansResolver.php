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

use App\Models\SubscriptionPlan;

/**
 * Builds the public-safe array of subscription plans used by the
 * marketing site (/pricing page + any future home-page teaser).
 *
 * Centralising this here keeps the marketing and in-app subscription
 * surfaces honest: both consume `$plan->displayFeatures()` 1:1 so an
 * admin-curated feature list shows identically on /pricing and on
 * /app/subscription — no public-only re-ordering or trimming.
 */
class PublicPlansResolver
{
    /**
     * @return array<int, array{
     *     id: int,
     *     slug: string,
     *     name: string,
     *     tagline: string,
     *     monthly_price: float,
     *     currency: string,
     *     default_credits: int,
     *     features: array<int, array{text: string, included: bool, highlight: bool}>,
     *     is_popular: bool,
     *     is_default: bool,
     *     is_free: bool,
     * }>
     */
    public function list(): array
    {
        return SubscriptionPlan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('monthly_price')
            ->get()
            ->map(fn (SubscriptionPlan $plan): array => [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'tagline' => $plan->tagline ?? '',
                'monthly_price' => (float) $plan->monthly_price,
                'currency' => $plan->currency,
                'default_credits' => (int) $plan->default_credits,
                'features' => $this->normalizeFeatures($plan->displayFeatures()),
                'is_popular' => (bool) $plan->is_popular,
                'is_default' => (bool) $plan->is_default,
                'is_free' => $plan->isFree(),
            ])
            ->values()
            ->all();
    }

    /**
     * Normalize the admin-curated feature list into the strict shape
     * the public frontend expects (`text/included/highlight` all
     * present). We intentionally preserve order and length so the
     * /pricing page mirrors /app/subscription exactly.
     *
     * @param  array<int, array{text?: string, included?: bool, highlight?: bool}>  $features
     * @return array<int, array{text: string, included: bool, highlight: bool}>
     */
    private function normalizeFeatures(array $features): array
    {
        return array_map(
            fn (array $f): array => [
                'text' => (string) ($f['text'] ?? ''),
                'included' => (bool) ($f['included'] ?? false),
                'highlight' => (bool) ($f['highlight'] ?? false),
            ],
            array_values($features),
        );
    }
}

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

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'slug',
    'tagline',
    'description',
    'cta_label',
    'monthly_price',
    'yearly_price',
    'currency',
    'default_credits',
    'rollover_unused_credits',
    'stripe_product_id',
    'stripe_monthly_price_id',
    'stripe_yearly_price_id',
    'stripe_synced_at',
    'limits',
    'features',
    'is_active',
    'is_popular',
    'is_default',
    'sort_order',
])]
class SubscriptionPlan extends Model
{
    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'yearly_price' => 'decimal:2',
            'default_credits' => 'integer',
            'rollover_unused_credits' => 'boolean',
            'limits' => 'array',
            'features' => 'array',
            'is_active' => 'boolean',
            'is_popular' => 'boolean',
            'is_default' => 'boolean',
            'sort_order' => 'integer',
            'stripe_synced_at' => 'datetime',
        ];
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isFree(): bool
    {
        return (float) $this->monthly_price === 0.0 && (float) $this->yearly_price === 0.0;
    }

    /**
     * Look up a feature limit value. -1 means unlimited.
     * Returns null when the plan does not declare the key.
     */
    public function limit(string $key): ?int
    {
        $value = ($this->limits ?? [])[$key] ?? null;

        return $value === null ? null : (int) $value;
    }

    /**
     * Whether this plan includes the certificates feature. The
     * `certificates` limit is a boolean-style flag (0 / 1) on the
     * limits JSON column; absent values default to off so newly
     * created plans start locked.
     */
    public function allowsCertificates(): bool
    {
        return (int) (($this->limits ?? [])['certificates'] ?? 0) === 1;
    }

    /**
     * Convenience: the human-readable display copy used by the user
     * subscription page. The page itself may augment this when needed.
     *
     * @return array<int, array{text: string, included: bool, highlight?: bool}>
     */
    public function displayFeatures(): array
    {
        return is_array($this->features) ? $this->features : [];
    }
}

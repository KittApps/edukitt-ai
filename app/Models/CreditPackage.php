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
    'credits',
    'price_cents',
    'currency',
    'stripe_price_id',
    'badge',
    'is_active',
    'sort_order',
])]
class CreditPackage extends Model
{
    protected function casts(): array
    {
        return [
            'credits' => 'integer',
            'price_cents' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return HasMany<CreditPackPurchase, $this> */
    public function creditPackPurchases(): HasMany
    {
        return $this->hasMany(CreditPackPurchase::class, 'credit_package_id');
    }

    public function priceFloat(): float
    {
        return $this->price_cents / 100;
    }

    public function perCreditFloat(): float
    {
        if ($this->credits <= 0) {
            return 0.0;
        }

        return $this->priceFloat() / $this->credits;
    }
}

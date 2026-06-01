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
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'credit_package_id',
    'credits',
    'amount_cents',
    'currency',
    'stripe_session_id',
    'stripe_payment_intent_id',
    'status',
])]
class CreditPackPurchase extends Model
{
    protected function casts(): array
    {
        return [
            'credits' => 'integer',
            'amount_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<CreditPackage, $this> */
    public function package(): BelongsTo
    {
        return $this->belongsTo(CreditPackage::class, 'credit_package_id');
    }

    public function amountFloat(): float
    {
        return $this->amount_cents / 100;
    }
}

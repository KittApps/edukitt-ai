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
    'plan_credits_remaining',
    'purchased_credits_remaining',
    'total_used_this_period',
    'period_starts_at',
    'period_ends_at',
    'last_renewed_at',
])]
class UserCreditBalance extends Model
{
    protected function casts(): array
    {
        return [
            'plan_credits_remaining' => 'integer',
            'purchased_credits_remaining' => 'integer',
            'total_used_this_period' => 'integer',
            'period_starts_at' => 'datetime',
            'period_ends_at' => 'datetime',
            'last_renewed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function availableCredits(): int
    {
        return $this->plan_credits_remaining + $this->purchased_credits_remaining;
    }

    /**
     * Total credits available for this period including those
     * already consumed. Used by the user-facing "{used} / {total}"
     * display so the denominator is stable until renewal.
     */
    public function periodCapacity(): int
    {
        return $this->total_used_this_period + $this->availableCredits();
    }
}

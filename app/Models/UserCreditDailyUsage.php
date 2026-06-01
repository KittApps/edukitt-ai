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

use App\Services\Billing\CreditService;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Daily rollup of credit usage per `(user_id, date, task_type)`.
 *
 * Written by {@see CreditService::debit()} via UPSERT
 * so concurrent AI calls atomically increment the matching bucket. Read
 * by the Subscription "Usage" tab to render a stacked area chart in a
 * single indexed SELECT.
 */
#[Fillable([
    'user_id',
    'task_type',
    'date',
    'credits_used',
])]
class UserCreditDailyUsage extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'credits_used' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

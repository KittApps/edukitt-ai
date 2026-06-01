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

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One-pending-per-user record of an in-flight email change. Holds a
 * hashed verification code (plaintext never persisted) plus the
 * counters {@see \App\Services\Auth\EmailChangeService} uses to
 * rate-limit resends and cap verify attempts.
 */
class EmailChangeRequest extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'last_sent_at' => 'datetime',
            'resend_window_started_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}

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
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'course_id',
    'issued_at',
    'revoked_at',
    'recipient_name',
    'course_name',
    'difficulty',
    'completion_time',
])]
class CourseCertificate extends Model
{
    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Course, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Active (non-revoked) certificates only.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('revoked_at');
    }

    /**
     * Public, human-friendly certificate number used by the UI and the PDF.
     * Format: EDU-{issue-year}-{6-digit-zero-padded-id}. Reading this from
     * a single accessor keeps the frontend, backend, and PDF in sync.
     *
     * @return Attribute<string, never>
     */
    protected function formattedNumber(): Attribute
    {
        return Attribute::get(function (): string {
            $year = $this->issued_at?->year ?? now()->year;
            $padded = str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);

            return "EDU-{$year}-{$padded}";
        });
    }
}

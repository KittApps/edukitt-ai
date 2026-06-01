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
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'api_key', 'is_active'])]
class AiProvider extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'api_key' => 'encrypted',
        ];
    }

    /** @return HasMany<AiProviderModel, $this> */
    public function models(): HasMany
    {
        return $this->hasMany(AiProviderModel::class);
    }

    /** @return HasMany<AiContentTaskAssignment, $this> */
    public function taskAssignments(): HasMany
    {
        return $this->hasMany(AiContentTaskAssignment::class);
    }

    /** @param Builder<static> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}

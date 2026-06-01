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

#[Fillable([
    'task_type',
    'key',
    'label',
    'description',
    'sort_order',
    'is_active',
])]
class PersonalizeOptionGroup extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return HasMany<PersonalizeOption, $this> */
    public function options(): HasMany
    {
        return $this->hasMany(PersonalizeOption::class)->orderBy('sort_order');
    }

    /**
     * @param  Builder<static>  $query
     */
    public function scopeForTask(Builder $query, string $taskType): void
    {
        $query->where('task_type', $taskType);
    }

    /**
     * @param  Builder<static>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}

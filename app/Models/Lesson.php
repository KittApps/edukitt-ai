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
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'module_id',
    'title',
    'summary',
    'content',
    'is_generated',
    'completed_at',
    'sort_order',
    'estimated_duration',
])]
class Lesson extends Model
{
    protected $table = 'course_lessons';

    protected function casts(): array
    {
        return [
            'content' => 'json',
            'is_generated' => 'boolean',
            'completed_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Module, $this> */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /** @return Attribute<bool, never> */
    protected function isCompleted(): Attribute
    {
        return Attribute::get(fn () => $this->completed_at !== null);
    }
}

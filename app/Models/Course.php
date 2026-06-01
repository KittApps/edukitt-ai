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
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'title',
    'description',
    'language',
    'ai_model_name',
    'difficulty',
    'learning_style',
    'duration',
    'status',
    'progress',
    'topic',
    'preferences',
    'last_accessed_at',
])]
class Course extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'preferences' => 'json',
            'progress' => 'integer',
            'last_accessed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Module, $this> */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('sort_order');
    }

    /**
     * All lessons across every module on this course — used with
     * `withCount(['lessons'])` to compute progress in a single
     * subquery instead of hydrating every Module + Lesson row.
     *
     * @return HasManyThrough<Lesson, Module, $this>
     */
    public function lessons(): HasManyThrough
    {
        return $this->hasManyThrough(Lesson::class, Module::class);
    }

    /** @return HasMany<CourseResource, $this> */
    public function resources(): HasMany
    {
        return $this->hasMany(CourseResource::class);
    }

    /** @return Attribute<int, never> */
    protected function lessonsCount(): Attribute
    {
        return Attribute::get(fn () => $this->modules->sum(
            fn (Module $module) => $module->lessons->count(),
        ));
    }

    /** @return Attribute<int, never> */
    protected function completedLessonsCount(): Attribute
    {
        return Attribute::get(fn () => $this->modules->sum(
            fn (Module $module) => $module->lessons->where('is_generated', true)->count(),
        ));
    }
}

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

/**
 * One (provider, model) configuration eligible for a given task.
 *
 * Each row belongs to an AiContentTask. Per task, exactly one row
 * is `is_default = true` — that row is what the runtime resolver
 * picks today via {@see self::defaultForTaskKey()}. The remaining
 * rows are alternatives the end user may later be allowed to pick
 * from on a per-generation basis.
 *
 * Replaces the legacy 1:1 AiContentConfig model.
 */
#[Fillable([
    'ai_content_task_id',
    'ai_provider_id',
    'ai_provider_model_id',
    'temperature',
    'max_tokens',
    'is_default',
    'is_paid_only',
    'sort_order',
])]
class AiContentTaskAssignment extends Model
{
    protected function casts(): array
    {
        return [
            'temperature' => 'decimal:2',
            'max_tokens' => 'integer',
            'is_default' => 'boolean',
            'is_paid_only' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<AiContentTask, $this> */
    public function task(): BelongsTo
    {
        return $this->belongsTo(AiContentTask::class, 'ai_content_task_id');
    }

    /** @return BelongsTo<AiProvider, $this> */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    /** @return BelongsTo<AiProviderModel, $this> */
    public function model(): BelongsTo
    {
        return $this->belongsTo(AiProviderModel::class, 'ai_provider_model_id');
    }

    /**
     * Hot-path lookup used by {@see \App\Services\Ai\TaskAssignmentResolver}.
     *
     * Returns the default assignment for the given task key with
     * provider + model eager-loaded so the resolver can hand the
     * provider slug / model id straight to the laravel/ai agent.
     * Null when the task doesn't exist or has no default set.
     */
    public static function defaultForTaskKey(string $taskKey): ?self
    {
        return static::query()
            ->with(['provider', 'model'])
            ->whereHas('task', fn ($q) => $q->where('key', $taskKey))
            ->where('is_default', true)
            ->first();
    }
}

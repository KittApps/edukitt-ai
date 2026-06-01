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
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'user_id',
    'task_type',
    'invocation_id',
    'ai_provider_id',
    'ai_provider_model_id',
    'provider_slug',
    'model_id',
    'prompt_tokens',
    'completion_tokens',
    'cache_read_input_tokens',
    'cache_write_input_tokens',
    'reasoning_tokens',
    'input_rate',
    'output_rate',
    'input_cost',
    'output_cost',
    'total_cost',
    'trackable_type',
    'trackable_id',
])]
class AiTokenUsage extends Model
{
    protected function casts(): array
    {
        return [
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'cache_read_input_tokens' => 'integer',
            'cache_write_input_tokens' => 'integer',
            'reasoning_tokens' => 'integer',
            'input_rate' => 'decimal:4',
            'output_rate' => 'decimal:4',
            'input_cost' => 'decimal:6',
            'output_cost' => 'decimal:6',
            'total_cost' => 'decimal:6',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

    /** @return MorphTo<Model, $this> */
    public function trackable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Total input-side tokens (prompt + cache reads + cache writes).
     * Cache reads are typically discounted, but for analytics totals
     * we treat anything sent to the model as "input".
     */
    public function getTotalInputTokensAttribute(): int
    {
        return $this->prompt_tokens
            + $this->cache_read_input_tokens
            + $this->cache_write_input_tokens;
    }

    /**
     * Total output-side tokens (completion + reasoning).
     */
    public function getTotalOutputTokensAttribute(): int
    {
        return $this->completion_tokens + $this->reasoning_tokens;
    }
}

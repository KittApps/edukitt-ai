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
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'ai_provider_id',
    'name',
    'model_id',
    'input_price_per_million',
    'output_price_per_million',
    'is_active',
])]
class AiProviderModel extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'input_price_per_million' => 'decimal:4',
            'output_price_per_million' => 'decimal:4',
        ];
    }

    /** @return BelongsTo<AiProvider, $this> */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    /** @return HasMany<AiContentTaskAssignment, $this> */
    public function taskAssignments(): HasMany
    {
        return $this->hasMany(AiContentTaskAssignment::class);
    }
}

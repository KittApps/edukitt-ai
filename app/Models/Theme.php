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

/**
 * App-side theme registered in the `themes` table.
 *
 * The `key` column matches a CSS class defined in resources/css/app.css
 * (or the special value `default`, which means "no scoped class —
 * use the @theme block as-is"). End users only ever see themes whose
 * {@see self::$enabled} flag is true.
 */
#[Fillable(['key', 'name', 'description', 'enabled', 'is_dark', 'position'])]
class Theme extends Model
{
    public const DEFAULT_KEY = 'default';

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'is_dark' => 'boolean',
            'position' => 'integer',
        ];
    }

    /** @param  Builder<self>  $query */
    public function scopeEnabled(Builder $query): Builder
    {
        return $query->where('enabled', true);
    }

    /** @param  Builder<self>  $query */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('position')->orderBy('id');
    }

    /**
     * The CSS class to apply on the layout root for this theme.
     * Returns null for the default theme (no scoped class needed).
     */
    public function cssClass(): ?string
    {
        return $this->key === self::DEFAULT_KEY ? null : $this->key;
    }
}

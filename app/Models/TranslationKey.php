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
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'group',
    'key',
    'source',
    'placeholders',
    'is_auto_synced',
    'last_seen_in_code_at',
])]
class TranslationKey extends Model
{
    protected function casts(): array
    {
        return [
            'placeholders' => 'array',
            'is_auto_synced' => 'boolean',
            'last_seen_in_code_at' => 'datetime',
        ];
    }

    /** @return HasMany<Translation, $this> */
    public function translations(): HasMany
    {
        return $this->hasMany(Translation::class);
    }

    /**
     * Extract {placeholder} tokens from a text, in order of first
     * appearance, deduplicated.
     *
     * The DB-backed dictionary uses curly-brace style exclusively;
     * framework keys imported from lang/*.php are normalised from
     * Laravel's `:placeholder` syntax to `{placeholder}` by
     * {@see \App\Console\Commands\SyncLocaleCommand}, and
     * {@see \App\Services\Localization\DatabaseTranslator} converts
     * back transparently for the validator at read time.
     *
     * @return array<int, string>
     */
    public static function extractPlaceholders(?string $text): array
    {
        if (!$text) {
            return [];
        }

        preg_match_all('/\{([a-zA-Z_][\w]*)\}/', $text, $matches);

        return array_values(array_unique($matches[1] ?? []));
    }

    /**
     * Derive the group from a dotted key. First segment is the group,
     * else fall back to "general".
     */
    public static function deriveGroup(string $key): string
    {
        return str_contains($key, '.') ? Str::before($key, '.') : 'general';
    }
}

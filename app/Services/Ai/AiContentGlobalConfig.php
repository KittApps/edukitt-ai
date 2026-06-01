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

namespace App\Services\Ai;

use App\Models\Setting;

/**
 * Global behaviour switches for the AI content generation flows.
 *
 * These live in the `settings` table under the `ai_content` group and
 * are surfaced on the admin "Default" task editor → Configuration tab.
 * They are intentionally orthogonal to the per-task (provider, model)
 * assignments — they describe what the end-user UI is allowed to do,
 * not which model the resolver picks.
 *
 * Each setting carries a default in {@see DEFAULTS}; when no row
 * exists in the store the default is returned. The stored value is
 * coerced back to the default's type on read so the front-end never
 * has to deal with stringly-typed JSON quirks.
 */
class AiContentGlobalConfig
{
    public const GROUP = 'ai_content';

    public const KEY_USER_CAN_SELECT_MODEL = 'user_can_select_model';

    public const KEY_MERGE_COURSE_GENERATION = 'merge_course_generation';

    public const KEY_SHOW_LANGUAGE_SELECTOR = 'show_language_selector';

    public const KEY_SUPPORTED_LANGUAGES = 'supported_languages';

    /**
     * Default values used when no row exists in the settings store yet.
     *
     * @var array<string, mixed>
     */
    private const DEFAULTS = [
        self::KEY_USER_CAN_SELECT_MODEL => false,
        self::KEY_MERGE_COURSE_GENERATION => false,
        self::KEY_SHOW_LANGUAGE_SELECTOR => true,
        self::KEY_SUPPORTED_LANGUAGES => [
            ['code' => 'en', 'name' => 'English', 'is_default' => true]
        ],
    ];

    /**
     * Snapshot of every global setting, suitable for shipping straight
     * to Inertia. Each value is coerced back to the type of its
     * configured default so the front-end can rely on consistent
     * shapes regardless of what's currently in the JSON column.
     *
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        $payload = [];
        foreach (self::DEFAULTS as $key => $default) {
            $stored = Setting::get(self::GROUP, $key, null);
            $value = $stored ?? $default;
            $payload[$key] = $this->coerce($value, $default);
        }

        return $payload;
    }

    /**
     * Persist the snapshot. Only known keys are written; unknown keys
     * in the payload are silently dropped so a malicious or stale
     * client can't smuggle settings into the group.
     *
     * @param  array<string, mixed>  $values
     */
    public function save(array $values): void
    {
        foreach (self::DEFAULTS as $key => $default) {
            if (! array_key_exists($key, $values)) {
                continue;
            }
            $value = $this->coerce($values[$key], $default);
            if ($key === self::KEY_SUPPORTED_LANGUAGES && is_array($value)) {
                $value = $this->normaliseLanguages($value);
            }
            Setting::set(self::GROUP, $key, $value);
        }
    }

    /**
     * Read a single setting; convenience for app-side callers later.
     */
    public function get(string $key): mixed
    {
        if (! array_key_exists($key, self::DEFAULTS)) {
            return null;
        }
        $default = self::DEFAULTS[$key];
        $stored = Setting::get(self::GROUP, $key, null);

        return $this->coerce($stored ?? $default, $default);
    }

    /**
     * Coerce a stored value to the type implied by its default. Bools
     * are normalised, arrays are guaranteed to be arrays, scalars
     * stay as-is.
     */
    private function coerce(mixed $value, mixed $default): mixed
    {
        if (is_bool($default)) {
            return (bool) $value;
        }
        if (is_array($default)) {
            return is_array($value) ? $value : $default;
        }

        return $value;
    }

    /**
     * Defensive normalisation for the language list:
     *
     *  - codes are trimmed + lowercased and rows with empty code/name
     *    are dropped,
     *  - duplicate codes keep the first occurrence,
     *  - exactly one row carries `is_default = true`; if none of the
     *    submitted rows are flagged, the first row is promoted.
     *
     * @param  array<int, array<string, mixed>>  $languages
     * @return array<int, array<string, mixed>>
     */
    private function normaliseLanguages(array $languages): array
    {
        $seen = [];
        $clean = [];
        foreach ($languages as $lang) {
            if (! is_array($lang)) {
                continue;
            }
            $code = strtolower(trim((string) ($lang['code'] ?? '')));
            $name = trim((string) ($lang['name'] ?? ''));
            if ($code === '' || $name === '' || isset($seen[$code])) {
                continue;
            }
            $seen[$code] = true;
            $clean[] = [
                'code' => $code,
                'name' => $name,
                'is_default' => (bool) ($lang['is_default'] ?? false),
            ];
        }

        if ($clean === []) {
            return $clean;
        }

        $defaultIndex = null;
        foreach ($clean as $i => $row) {
            if ($row['is_default']) {
                $defaultIndex = $i;
                break;
            }
        }
        $defaultIndex ??= 0;

        foreach ($clean as $i => $row) {
            $clean[$i]['is_default'] = $i === $defaultIndex;
        }

        return $clean;
    }
}

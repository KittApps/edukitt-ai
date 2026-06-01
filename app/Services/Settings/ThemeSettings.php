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

namespace App\Services\Settings;

use App\Models\Setting;
use App\Models\Theme;
use App\Models\User;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Typed accessor for the `theme` settings group + companion `themes`
 * table. Resolves which theme any given request should render with.
 *
 * Mirrors the pattern used by GeneralSettings / QueueSettingsResolver:
 * one class per logical settings group, sensible defaults baked in,
 * never throws during install/migrate (silently falls back to the
 * default theme when the underlying tables aren't there yet).
 */
class ThemeSettings
{
    public const GROUP = 'theme';

    public const KEY_DEFAULT_KEY = 'default_key';

    public const KEY_USER_SELECTION_ENABLED = 'user_selection_enabled';

    public const FALLBACK_DEFAULT = Theme::DEFAULT_KEY;

    /**
     * Admin-configured default theme key. Falls back to `default`
     * (the original purple theme) if nothing is set or the table is
     * not yet migrated.
     */
    public function defaultKey(): string
    {
        $key = $this->get(self::KEY_DEFAULT_KEY, self::FALLBACK_DEFAULT);

        return is_string($key) && $key !== '' ? $key : self::FALLBACK_DEFAULT;
    }

    public function isUserSelectionEnabled(): bool
    {
        return (bool) $this->get(self::KEY_USER_SELECTION_ENABLED, false);
    }

    /**
     * @return Collection<int, Theme>
     */
    public function allThemes(): Collection
    {
        try {
            return Theme::query()->ordered()->get();
        } catch (Throwable) {
            return new Collection;
        }
    }

    /**
     * @return Collection<int, Theme>
     */
    public function enabledThemes(): Collection
    {
        return $this->allThemes()->filter(fn (Theme $t) => $t->enabled)->values();
    }

    /**
     * Resolve the theme key the given request/user should render with.
     *
     * Order of precedence:
     *   1. user.theme  (only when admin allows user selection AND the
     *      stored key is currently enabled)
     *   2. admin default_key  (when that theme is enabled)
     *   3. fallback `default`  (always available, even when disabled,
     *      so we never end up with no theme at all)
     */
    public function resolveActiveKey(?User $user): string
    {
        $enabledKeys = $this->enabledThemes()->pluck('key')->all();

        if ($this->isUserSelectionEnabled() && $user !== null) {
            $userKey = $user->theme;
            if (is_string($userKey) && $userKey !== '' && in_array($userKey, $enabledKeys, true)) {
                return $userKey;
            }
        }

        $default = $this->defaultKey();
        if (in_array($default, $enabledKeys, true)) {
            return $default;
        }

        return self::FALLBACK_DEFAULT;
    }

    /**
     * Snapshot for the admin Theme tab.
     *
     * @return array{
     *     allow_user_selection: bool,
     *     default_key: string,
     *     themes: array<int, array{
     *         key: string,
     *         name: string,
     *         description: ?string,
     *         enabled: bool,
     *         is_dark: bool,
     *         position: int,
     *     }>,
     * }
     */
    public function snapshot(): array
    {
        return [
            'allow_user_selection' => $this->isUserSelectionEnabled(),
            'default_key' => $this->defaultKey(),
            'themes' => $this->allThemes()->map(fn (Theme $t) => [
                'key' => $t->key,
                'name' => $t->name,
                'description' => $t->description,
                'enabled' => $t->enabled,
                'is_dark' => $t->is_dark,
                'position' => $t->position,
            ])->all(),
        ];
    }

    /**
     * Snapshot shared with every Inertia page so the layout can apply
     * the right CSS class and the header switcher knows what to list.
     *
     * @return array{
     *     active: string,
     *     allow_user_selection: bool,
     *     available: array<int, array{key: string, name: string, is_dark: bool}>,
     * }
     */
    public function publicSnapshot(?User $user): array
    {
        return [
            'active' => $this->resolveActiveKey($user),
            'allow_user_selection' => $this->isUserSelectionEnabled(),
            'available' => $this->enabledThemes()->map(fn (Theme $t) => [
                'key' => $t->key,
                'name' => $t->name,
                'is_dark' => $t->is_dark,
            ])->all(),
        ];
    }

    private function get(string $key, mixed $default = null): mixed
    {
        try {
            return Setting::get(self::GROUP, $key, $default);
        } catch (Throwable) {
            return $default;
        }
    }
}

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
use Throwable;

/**
 * Typed accessor for the `certificates` settings group.
 *
 * Admin-controlled knobs:
 *   - `enabled`           : master kill-switch. When off the feature
 *                           is gated everywhere (routes, sidebar,
 *                           course page) so the rest of the app
 *                           behaves as if certificates don't exist.
 *   - `primary_color`     : optional hex override used as the accent.
 *                           When blank, derived from the active site
 *                           theme so the cert tracks theme changes
 *                           out of the box.
 *   - `background_color`  : page background in the admin preview. Learners
 *                           print from the in-app certificate screen.
 */
class CertificateSettings
{
    public const GROUP = 'certificates';

    public const KEY_ENABLED = 'enabled';

    public const KEY_PRIMARY_COLOR = 'primary_color';

    public const KEY_BACKGROUND_COLOR = 'background_color';

    public const DEFAULT_ENABLED = true;

    public const DEFAULT_BACKGROUND_COLOR = '#ffffff';

    /**
     * Fallback hex used when no theme matches and the admin hasn't
     * pinned a color. Matches the original certificate accent.
     */
    public const FALLBACK_COLOR = '#6366f1';

    /**
     * Per-theme accent hex. Mirrors the `--color-primary` declared
     * in each `resources/css/themes/*.css` file so the certificate
     * follows whatever theme the admin set as default.
     *
     * @var array<string, string>
     */
    private const THEME_PRIMARY_COLORS = [
        'default' => '#6c3ce0',
        'dark' => '#a478ff',
        'ocean' => '#0e7490',
        'forest' => '#047857',
        'sunset' => '#ea580c',
        'sepia' => '#92400e',
        'slate' => '#475569',
        'solarized' => '#268bd2',
        'mint' => '#0d9488',
        'nord' => '#5e81ac',
    ];

    public function __construct(
        private readonly ThemeSettings $themes,
    ) {}

    public function isEnabled(): bool
    {
        return (bool) $this->get(self::KEY_ENABLED, self::DEFAULT_ENABLED);
    }

    /**
     * Admin-pinned override, or null if the admin wants the theme
     * default. Returned as-is (no expansion) so the admin form can
     * show "(using theme default)" hints.
     */
    public function primaryColorOverride(): ?string
    {
        $value = $this->get(self::KEY_PRIMARY_COLOR);

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * Effective primary color used for the admin certificate preview and
     * shared with the app shell. Resolves the override → admin default
     * theme → safe fallback. Always returns a 7-char hex.
     */
    public function effectivePrimaryColor(): string
    {
        $override = $this->primaryColorOverride();
        if ($override !== null) {
            return $this->normalizeHex($override);
        }

        $themeKey = $this->themes->defaultKey();

        return self::THEME_PRIMARY_COLORS[$themeKey] ?? self::FALLBACK_COLOR;
    }

    /**
     * Effective page background shown in the admin certificate preview.
     */
    public function effectiveBackgroundColor(): string
    {
        $value = $this->get(self::KEY_BACKGROUND_COLOR);
        if (is_string($value) && $value !== '') {
            return $this->normalizeHex($value);
        }

        return self::DEFAULT_BACKGROUND_COLOR;
    }

    /**
     * Snapshot for the admin Certificates tab.
     *
     * @return array{
     *     enabled: bool,
     *     primary_color: ?string,
     *     theme_default_color: string,
     *     effective_color: string,
     *     background_color: string,
     *     default_background_color: string,
     * }
     */
    public function snapshot(): array
    {
        $themeKey = $this->themes->defaultKey();
        $themeDefault = self::THEME_PRIMARY_COLORS[$themeKey] ?? self::FALLBACK_COLOR;

        return [
            'enabled' => $this->isEnabled(),
            'primary_color' => $this->primaryColorOverride(),
            'theme_default_color' => $themeDefault,
            'effective_color' => $this->effectivePrimaryColor(),
            'background_color' => $this->effectiveBackgroundColor(),
            'default_background_color' => self::DEFAULT_BACKGROUND_COLOR,
        ];
    }

    /**
     * Public-facing snapshot shared with every Inertia page so the
     * sidebar / course view can hide certificate UI when the feature
     * is globally off.
     *
     * @return array{enabled: bool, primary_color: string, background_color: string}
     */
    public function publicSnapshot(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'primary_color' => $this->effectivePrimaryColor(),
            'background_color' => $this->effectiveBackgroundColor(),
        ];
    }

    /**
     * Coerce admin input into a 7-char `#rrggbb` hex. Falls back to
     * the safe constant when the input isn't recognisable.
     */
    private function normalizeHex(string $value): string
    {
        $value = trim($value);
        if (! str_starts_with($value, '#')) {
            $value = '#'.$value;
        }

        if (preg_match('/^#[0-9a-fA-F]{6}$/', $value)) {
            return strtolower($value);
        }

        if (preg_match('/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/', $value, $m)) {
            return strtolower("#{$m[1]}{$m[1]}{$m[2]}{$m[2]}{$m[3]}{$m[3]}");
        }

        return self::FALLBACK_COLOR;
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

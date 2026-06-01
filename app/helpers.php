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

use App\Services\LocalizationService;

if (!function_exists('t')) {
    /**
     * Translate a localization key. Falls back to the provided English fallback,
     * then the key itself. Supports {placeholder} replacement.
     *
     * @param  array<string, string|int|float>  $replace
     */
    function t(string $key, ?string $fallback = null, array $replace = []): string
    {
        return app(LocalizationService::class)->translate($key, $fallback, $replace);
    }
}

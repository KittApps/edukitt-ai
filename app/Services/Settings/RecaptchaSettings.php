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
 * Typed accessor for the `recaptcha` settings group.
 *
 * Stores the Google reCAPTCHA v2 site key (public) in plaintext and
 * the secret key encrypted via {@see SecretSetting}.
 */
class RecaptchaSettings
{
    public const GROUP = 'recaptcha';

    public const KEY_ENABLED = 'enabled';

    public const KEY_SITE_KEY = 'site_key';

    public const KEY_SECRET_KEY = 'secret_key';

    public function isEnabled(): bool
    {
        return (bool) $this->get(self::KEY_ENABLED, false)
            && $this->siteKey() !== null
            && $this->hasSecretKey();
    }

    public function siteKey(): ?string
    {
        $value = $this->get(self::KEY_SITE_KEY);

        return is_string($value) && $value !== '' ? $value : null;
    }

    public function secretKey(): ?string
    {
        return SecretSetting::get(self::GROUP, self::KEY_SECRET_KEY);
    }

    public function hasSecretKey(): bool
    {
        return SecretSetting::has(self::GROUP, self::KEY_SECRET_KEY);
    }

    /**
     * @return array{
     *     enabled: bool,
     *     site_key: ?string,
     *     secret_set: bool,
     *     effective: bool,
     * }
     */
    public function snapshot(): array
    {
        $enabledFlag = (bool) $this->get(self::KEY_ENABLED, false);

        return [
            'enabled' => $enabledFlag,
            'site_key' => $this->siteKey(),
            'secret_set' => $this->hasSecretKey(),
            'effective' => $this->isEnabled(),
        ];
    }

    /**
     * Public-facing snapshot shared with every Inertia page so the
     * auth forms can render the widget when reCAPTCHA is active.
     *
     * @return array{enabled: bool, site_key: ?string}
     */
    public function publicSnapshot(): array
    {
        if (! $this->isEnabled()) {
            return ['enabled' => false, 'site_key' => null];
        }

        return [
            'enabled' => true,
            'site_key' => $this->siteKey(),
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

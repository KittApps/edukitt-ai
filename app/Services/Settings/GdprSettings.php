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
 * Typed accessor for the `gdpr` settings group.
 *
 * Drives the public cookie-consent banner mounted by PublicLayout.
 * All keys default to safe, opt-in-friendly values so the banner
 * works out of the box on a fresh install without any admin setup.
 */
class GdprSettings
{
    public const GROUP = 'gdpr';

    public const KEY_ENABLED = 'enabled';

    public const KEY_BANNER_MESSAGE = 'banner_message';

    public const KEY_ACCEPT_LABEL = 'accept_label';

    public const KEY_DECLINE_LABEL = 'decline_label';

    public const KEY_POLICY_URL = 'policy_url';

    public const KEY_POLICY_LABEL = 'policy_label';

    /**
     * @return array{
     *     enabled: bool,
     *     banner_message: string,
     *     accept_label: string,
     *     decline_label: string,
     *     policy_url: ?string,
     *     policy_label: string,
     * }
     */
    public function snapshot(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'banner_message' => $this->bannerMessage(),
            'accept_label' => $this->acceptLabel(),
            'decline_label' => $this->declineLabel(),
            'policy_url' => $this->policyUrl(),
            'policy_label' => $this->policyLabel(),
        ];
    }

    /**
     * Public-facing snapshot shared on every page. Only includes the
     * fields the banner actually needs and only when enabled — disabled
     * banner ships an empty object so the frontend can short-circuit.
     *
     * @return array{
     *     enabled: bool,
     *     banner_message?: string,
     *     accept_label?: string,
     *     decline_label?: string,
     *     policy_url?: ?string,
     *     policy_label?: string,
     * }
     */
    public function publicSnapshot(): array
    {
        if (! $this->isEnabled()) {
            return ['enabled' => false];
        }

        return [
            'enabled' => true,
            'banner_message' => $this->bannerMessage(),
            'accept_label' => $this->acceptLabel(),
            'decline_label' => $this->declineLabel(),
            'policy_url' => $this->policyUrl(),
            'policy_label' => $this->policyLabel(),
        ];
    }

    public function isEnabled(): bool
    {
        // Default ON — installs that haven't visited the admin tab yet
        // still satisfy basic EU/UK consent requirements out of the box.
        return (bool) $this->get(self::KEY_ENABLED, true);
    }

    public function bannerMessage(): string
    {
        return $this->getString(
            self::KEY_BANNER_MESSAGE,
            'We use cookies to provide essential functionality and to improve your experience. By continuing, you agree to our use of cookies.',
        );
    }

    public function acceptLabel(): string
    {
        return $this->getString(self::KEY_ACCEPT_LABEL, 'Accept');
    }

    public function declineLabel(): string
    {
        return $this->getString(self::KEY_DECLINE_LABEL, 'Decline');
    }

    public function policyUrl(): ?string
    {
        $value = $this->get(self::KEY_POLICY_URL);

        return is_string($value) && $value !== '' ? $value : null;
    }

    public function policyLabel(): string
    {
        return $this->getString(self::KEY_POLICY_LABEL, 'Learn more');
    }

    private function getString(string $key, string $default): string
    {
        $value = $this->get($key, $default);

        return is_string($value) && $value !== '' ? $value : $default;
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

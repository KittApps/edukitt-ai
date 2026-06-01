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

class ContactSettings
{
    public const GROUP = 'contact';

    public const KEY_ENABLED = 'enabled';

    public const KEY_RECIPIENT_EMAIL = 'recipient_email';

    public function isEnabled(): bool
    {
        return (bool) $this->get(self::KEY_ENABLED, true);
    }

    public function recipientEmail(): ?string
    {
        $value = $this->get(self::KEY_RECIPIENT_EMAIL);

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * Effective recipient: explicit setting first, then the global
     * From address as a sensible fallback so contact submissions
     * still go somewhere on a fresh install.
     */
    public function effectiveRecipient(): ?string
    {
        return $this->recipientEmail()
            ?? (string) (config('mail.from.address') ?: '') ?: null;
    }

    /**
     * @return array{
     *     enabled: bool,
     *     recipient_email: ?string,
     *     effective_recipient: ?string,
     * }
     */
    public function snapshot(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'recipient_email' => $this->recipientEmail(),
            'effective_recipient' => $this->effectiveRecipient(),
        ];
    }

    /** @return array{enabled: bool} */
    public function publicSnapshot(): array
    {
        return ['enabled' => $this->isEnabled()];
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

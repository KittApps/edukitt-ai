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
 * Typed accessor for the `general` settings group.
 *
 * Other parts of the codebase (RegisteredUserController, HandleInertiaRequests,
 * public-header CTAs) shouldn't reach into the raw key/value store with magic
 * strings — they consume this class instead so the set of available toggles
 * is discoverable and consistently defaulted.
 *
 * Mirrors the pattern used by MailSettingsResolver / QueueSettingsResolver:
 * one class per settings group, sensible defaults baked in, never throws
 * during install / migrate (silently falls back to defaults when the
 * settings table doesn't exist yet).
 *
 * Conceptually we split the keys into two logical sub-groups:
 *   - "site": copy admins control about the marketing surface
 *     (home <title>, meta description). Stored under `site_*`.
 *   - "brand": visual identity admins manage in the Brand tab
 *     (display name, logos for light/dark themes, favicon).
 */
class GeneralSettings
{
    public const GROUP = 'general';

    // --- Brand identity (Brand tab) ---
    public const KEY_SITE_NAME = 'site_name';

    public const KEY_LOGO = 'logo';

    public const KEY_LOGO_DARK = 'logo_dark';

    public const KEY_FAVICON = 'favicon';

    // --- Site copy (Site tab) ---
    public const KEY_SITE_TITLE = 'site_title';

    public const KEY_SITE_DESCRIPTION = 'site_description';

    public const KEY_SUPPORT_ENABLED = 'support_enabled';

    public const DEFAULT_SUPPORT_ENABLED = true;

    public const KEY_LANGUAGE_SWITCHER_ENABLED = 'language_switcher_enabled';

    public const DEFAULT_LANGUAGE_SWITCHER_ENABLED = true;

    /**
     * Default visitor locale on first visit (and when no session pick).
     * Configured on the Site tab. Independent of {@see Language::is_default},
     * which always denotes the English translation source.
     */
    public const KEY_SITE_DEFAULT_LANGUAGE_CODE = 'site.default_language_code';

    // --- Account policy ---
    public const KEY_REGISTER_ENABLED = 'register.enabled';

    public const KEY_REGISTER_EMAIL_VERIFICATION = 'register.email_verification';

    public const KEY_ACCOUNT_DELETION_ENABLED = 'account.deletion_enabled';

    public const DEFAULT_REGISTER_ENABLED = true;

    public const DEFAULT_REGISTER_EMAIL_VERIFICATION = false;

    public const DEFAULT_ACCOUNT_DELETION_ENABLED = true;

    public function isRegistrationEnabled(): bool
    {
        return (bool) $this->get(self::KEY_REGISTER_ENABLED, self::DEFAULT_REGISTER_ENABLED);
    }

    public function requiresEmailVerification(): bool
    {
        return (bool) $this->get(
            self::KEY_REGISTER_EMAIL_VERIFICATION,
            self::DEFAULT_REGISTER_EMAIL_VERIFICATION,
        );
    }

    public function isAccountDeletionEnabled(): bool
    {
        return (bool) $this->get(
            self::KEY_ACCOUNT_DELETION_ENABLED,
            self::DEFAULT_ACCOUNT_DELETION_ENABLED,
        );
    }

    public function siteName(): ?string
    {
        return $this->getString(self::KEY_SITE_NAME);
    }

    public function siteTitle(): ?string
    {
        return $this->getString(self::KEY_SITE_TITLE);
    }

    public function siteDescription(): ?string
    {
        return $this->getString(self::KEY_SITE_DESCRIPTION);
    }

    public function isSupportEnabled(): bool
    {
        return (bool) $this->get(self::KEY_SUPPORT_ENABLED, self::DEFAULT_SUPPORT_ENABLED);
    }

    public function isLanguageSwitcherEnabled(): bool
    {
        return (bool) $this->get(
            self::KEY_LANGUAGE_SWITCHER_ENABLED,
            self::DEFAULT_LANGUAGE_SWITCHER_ENABLED,
        );
    }

    /**
     * Admin-configured default site language code, or null when unset
     * ({@see LocalizationService} falls back to the translation source row).
     */
    public function siteDefaultLanguageCode(): ?string
    {
        $value = $this->get(self::KEY_SITE_DEFAULT_LANGUAGE_CODE);

        return is_string($value) && $value !== '' ? $value : null;
    }

    public function logoPath(): ?string
    {
        return $this->getString(self::KEY_LOGO);
    }

    public function logoDarkPath(): ?string
    {
        return $this->getString(self::KEY_LOGO_DARK);
    }

    public function faviconPath(): ?string
    {
        return $this->getString(self::KEY_FAVICON);
    }

    public function logoUrl(): ?string
    {
        return $this->resolveAssetUrl($this->logoPath());
    }

    public function logoDarkUrl(): ?string
    {
        return $this->resolveAssetUrl($this->logoDarkPath());
    }

    public function faviconUrl(): ?string
    {
        return $this->resolveAssetUrl($this->faviconPath());
    }

    /**
     * Snapshot for the admin General page. Booleans are coerced so the
     * frontend never has to deal with null / "1" string mismatches.
     *
     * @return array{
     *     site: array{title: ?string, description: ?string, support_enabled: bool, language_switcher_enabled: bool},
     *     brand: array{name: ?string, logo: ?string, logo_dark: ?string, favicon: ?string},
     *     account: array{registration_enabled: bool, email_verification: bool, deletion_enabled: bool},
     * }
     */
    public function snapshot(): array
    {
        return [
            'site' => [
                'title' => $this->siteTitle(),
                'description' => $this->siteDescription(),
                'support_enabled' => $this->isSupportEnabled(),
                'language_switcher_enabled' => $this->isLanguageSwitcherEnabled(),
            ],
            'brand' => [
                'name' => $this->siteName(),
                'logo' => $this->logoUrl(),
                'logo_dark' => $this->logoDarkUrl(),
                'favicon' => $this->faviconUrl(),
            ],
            'account' => [
                'registration_enabled' => $this->isRegistrationEnabled(),
                'email_verification' => $this->requiresEmailVerification(),
                'deletion_enabled' => $this->isAccountDeletionEnabled(),
            ],
        ];
    }

    /**
     * Public-facing brand snapshot shared with every Inertia page so
     * any layout can render the right logo / fall back to the brand
     * name when no logo is uploaded.
     *
     * @return array{
     *     name: ?string,
     *     logo: ?string,
     *     logo_dark: ?string,
     *     favicon: ?string,
     *     site_title: ?string,
     *     site_description: ?string,
     *     support_enabled: bool,
     *     language_switcher_enabled: bool,
     * }
     */
    public function publicSnapshot(): array
    {
        return [
            'name' => $this->siteName(),
            'logo' => $this->logoUrl(),
            'logo_dark' => $this->logoDarkUrl(),
            'favicon' => $this->faviconUrl(),
            'site_title' => $this->siteTitle(),
            'site_description' => $this->siteDescription(),
            'support_enabled' => $this->isSupportEnabled(),
            'language_switcher_enabled' => $this->isLanguageSwitcherEnabled(),
        ];
    }

    /**
     * Resolve a stored asset path to a fully qualified URL on the
     * `public` disk. The `public/storage` symlink (`php artisan
     * storage:link`) maps storage/app/public → /storage/* so
     * `asset('storage/'.$path)` is the correct browser URL. Returns
     * null if nothing is stored, or echoes the value back as-is when
     * it's already an absolute URL (e.g. a CDN link an admin pasted
     * into the settings store directly).
     */
    private function resolveAssetUrl(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }

        return asset('storage/'.ltrim($path, '/'));
    }

    /**
     * Safe read from the settings store. Returns $default when the
     * table is missing (install/migrate) or any other error trips.
     */
    private function get(string $key, mixed $default = null): mixed
    {
        try {
            return Setting::get(self::GROUP, $key, $default);
        } catch (Throwable) {
            return $default;
        }
    }

    /**
     * Same as get() but coerces empty strings to null so callers can
     * use simple null-coalescing instead of trimming.
     */
    private function getString(string $key): ?string
    {
        $value = $this->get($key);

        return is_string($value) && $value !== '' ? $value : null;
    }
}

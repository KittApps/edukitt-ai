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

namespace App\Services\Mail;

use App\Models\Setting;
use App\Services\Settings\SecretSetting;
use Illuminate\Support\Facades\Config;

/**
 * Push admin-managed SMTP / sender settings from the `settings` table
 * into the runtime `mail.mailers.smtp.*` and `mail.from.*` config so
 * Laravel's Mailer picks them up without restarting the app.
 *
 * Mirrors StripeSettingsResolver: the database values override the
 * .env / config file fallbacks at boot time, but only for fields the
 * operator has actually filled in. Unset fields fall through to the
 * existing config values.
 */
class MailSettingsResolver
{
    public const SETTINGS_GROUP = 'email';

    public const KEY_HOST = 'host';

    public const KEY_PORT = 'port';

    public const KEY_USERNAME = 'username';

    public const KEY_PASSWORD = 'password';

    public const KEY_ENCRYPTION = 'encryption';

    public const KEY_FROM_ADDRESS = 'from_address';

    public const KEY_FROM_NAME = 'from_name';

    /**
     * Sentinel returned to the UI in place of the real password so the
     * stored secret never round-trips to the browser.
     */
    public const STORED_PASSWORD_MASK = '••••••••';

    /**
     * Apply DB-stored mail settings to the runtime config.
     *
     * Safe to call during boot — silently skips if the settings table
     * is not available yet (early install / migrate phase).
     */
    public function applyToConfig(): void
    {
        try {
            $host = Setting::get(self::SETTINGS_GROUP, self::KEY_HOST);
            $port = Setting::get(self::SETTINGS_GROUP, self::KEY_PORT);
            $username = Setting::get(self::SETTINGS_GROUP, self::KEY_USERNAME);
            // Password is the only secret in this group — read it
            // through SecretSetting so we get the decrypted value
            // (and so legacy plaintext rows are auto-upgraded).
            $password = SecretSetting::get(self::SETTINGS_GROUP, self::KEY_PASSWORD);
            $encryption = Setting::get(self::SETTINGS_GROUP, self::KEY_ENCRYPTION);
            $fromAddress = Setting::get(self::SETTINGS_GROUP, self::KEY_FROM_ADDRESS);
            $fromName = Setting::get(self::SETTINGS_GROUP, self::KEY_FROM_NAME);
        } catch (\Throwable) {
            return;
        }

        if (! empty($host)) {
            Config::set('mail.mailers.smtp.host', $host);
        }

        if ($port !== null && $port !== '') {
            Config::set('mail.mailers.smtp.port', (int) $port);
        }

        if (! empty($username)) {
            Config::set('mail.mailers.smtp.username', $username);
        }

        if (! empty($password)) {
            Config::set('mail.mailers.smtp.password', $password);
        }

        // Symfony Mailer's smtp transport accepts ONLY `smtp` or `smtps`
        // as the scheme — `tls` / `ssl` (legacy SwiftMailer values) cause
        // "scheme is not supported". Map the user-friendly admin values:
        //   - tls → smtp  (STARTTLS upgrade on port 587; auto-negotiated)
        //   - ssl → smtps (implicit TLS on port 465)
        // We also drop `encryption` entirely since modern Laravel ignores
        // it and surfaced it only confuses the Mailer transport factory.
        if ($encryption !== null && $encryption !== '') {
            $scheme = $encryption === 'ssl' ? 'smtps' : 'smtp';
            Config::set('mail.mailers.smtp.scheme', $scheme);
            Config::set('mail.mailers.smtp.encryption', null);
        }

        if (! empty($fromAddress)) {
            Config::set('mail.from.address', $fromAddress);
        }

        if (! empty($fromName)) {
            Config::set('mail.from.name', $fromName);
        }

    }

    /**
     * Snapshot of the stored values, with the password normalised to a
     * boolean so callers don't accidentally surface the secret.
     *
     * @return array{
     *     host: ?string,
     *     port: ?int,
     *     username: ?string,
     *     password_set: bool,
     *     encryption: ?string,
     *     from_address: ?string,
     *     from_name: ?string,
     * }
     */
    public function snapshot(): array
    {
        $port = Setting::get(self::SETTINGS_GROUP, self::KEY_PORT);

        return [
            'host' => self::nullableString(Setting::get(self::SETTINGS_GROUP, self::KEY_HOST)),
            'port' => $port === null || $port === '' ? null : (int) $port,
            'username' => self::nullableString(Setting::get(self::SETTINGS_GROUP, self::KEY_USERNAME)),
            'password_set' => SecretSetting::has(self::SETTINGS_GROUP, self::KEY_PASSWORD),
            'encryption' => self::nullableString(Setting::get(self::SETTINGS_GROUP, self::KEY_ENCRYPTION)),
            'from_address' => self::nullableString(Setting::get(self::SETTINGS_GROUP, self::KEY_FROM_ADDRESS)),
            'from_name' => self::nullableString(Setting::get(self::SETTINGS_GROUP, self::KEY_FROM_NAME)),
        ];
    }

    /**
     * SMTP is "configured" when the operator has filled in everything
     * needed to actually send a message: a host, a port, a username and
     * a from-address. The password is intentionally not required since
     * some relays accept connections without auth.
     */
    public function isConfigured(): bool
    {
        $snap = $this->snapshot();

        return ! empty($snap['host'])
            && $snap['port'] !== null
            && ! empty($snap['username'])
            && ! empty($snap['from_address']);
    }

    private static function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $str = (string) $value;

        return $str === '' ? null : $str;
    }
}

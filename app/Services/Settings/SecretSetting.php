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
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * Encrypted-at-rest helpers for the polymorphic `settings` table.
 *
 * Most rows in `settings` are plain config values (host, port,
 * currency, …) and don't benefit from encryption. A handful are
 * genuine secrets — Stripe secret key, Stripe webhook secret, SMTP
 * password. We don't want to flip the whole table to the `encrypted`
 * cast because that would break every existing plaintext value at
 * once, so we encrypt at the boundary: {@see self::set()} writes
 * ciphertext, {@see self::get()} decrypts.
 *
 * Legacy plaintext rows still work transparently. On the first read,
 * the helper detects the failed decrypt, re-stores the value as
 * ciphertext, and returns the plaintext to the caller. After that
 * round-trip the row is permanently encrypted at rest.
 */
class SecretSetting
{
    /**
     * Persist `$value` to the settings table, encrypting it first.
     * Pass `null` or empty string to clear the row.
     */
    public static function set(string $group, string $key, ?string $value): void
    {
        if ($value === null || $value === '') {
            Setting::set($group, $key, null);

            return;
        }

        Setting::set($group, $key, Crypt::encryptString($value));
    }

    /**
     * Read and decrypt the stored value. Returns null when nothing
     * is stored. If the stored value is legacy plaintext (decrypt
     * fails) we transparently upgrade it to ciphertext in place so
     * subsequent reads use the fast path.
     */
    public static function get(string $group, string $key): ?string
    {
        $raw = Setting::get($group, $key);
        if ($raw === null || $raw === '') {
            return null;
        }

        $raw = (string) $raw;

        try {
            return Crypt::decryptString($raw);
        } catch (DecryptException) {
            // Legacy plaintext — best-effort upgrade in place so the
            // row stops being stored as cleartext. Never let the
            // auto-upgrade failure mask the working plaintext value.
            try {
                Setting::set($group, $key, Crypt::encryptString($raw));
            } catch (Throwable) {
                // ignore: returning the plaintext is more important
                // than upgrading the row right now.
            }

            return $raw;
        }
    }

    /**
     * True when a non-empty value is stored for `$group.$key`. Does
     * not decrypt — works regardless of whether the row is legacy
     * plaintext or already encrypted (both are non-empty when set).
     */
    public static function has(string $group, string $key): bool
    {
        $raw = Setting::get($group, $key);

        return ! ($raw === null || $raw === '');
    }
}

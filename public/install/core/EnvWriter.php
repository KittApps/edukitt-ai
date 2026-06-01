<?php
declare(strict_types=1);

namespace Install\Core;

/**
 * Reads .env.example, applies user-supplied overrides, and writes the
 * result to .env. Idempotent — repeated calls upsert keys without
 * duplicating them. No external dependencies.
 */
final class EnvWriter
{
    /**
     * Ensure .env exists by copying .env.example if needed.
     */
    public static function ensureExists(): bool
    {
        if (file_exists(INSTALL_ENV_FILE)) {
            return true;
        }
        if (!file_exists(INSTALL_ENV_EXAMPLE)) {
            return false;
        }

        return @copy(INSTALL_ENV_EXAMPLE, INSTALL_ENV_FILE);
    }

    /**
     * Upsert one or more KEY=VALUE pairs in .env. Values containing spaces,
     * quotes, hash, or equal signs are automatically quoted.
     *
     * @param array<string, string|int|bool|null> $pairs
     */
    public static function set(array $pairs): bool
    {
        if (!self::ensureExists()) {
            return false;
        }

        $contents = (string) file_get_contents(INSTALL_ENV_FILE);
        $eol = self::detectEol($contents);

        foreach ($pairs as $key => $value) {
            $contents = self::upsert($contents, (string) $key, self::normalize($value), $eol);
        }

        return file_put_contents(INSTALL_ENV_FILE, $contents) !== false;
    }

    private static function upsert(string $contents, string $key, string $value, string $eol): string
    {
        $line = $key . '=' . $value;
        $pattern = '/^[ \t]*' . preg_quote($key, '/') . '[ \t]*=.*$/m';

        if (preg_match($pattern, $contents) === 1) {
            return preg_replace($pattern, self::escapeReplace($line), $contents) ?? $contents;
        }

        if ($contents !== '' && !str_ends_with($contents, $eol)) {
            $contents .= $eol;
        }

        return $contents . $line . $eol;
    }

    private static function escapeReplace(string $replacement): string
    {
        return str_replace(['\\', '$'], ['\\\\', '\\$'], $replacement);
    }

    private static function normalize(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        $string = (string) $value;

        if ($string === '') {
            return '';
        }

        $needsQuote = preg_match('/[\s"\'#=]/', $string) === 1;
        if ($needsQuote) {
            $escaped = str_replace(['\\', '"'], ['\\\\', '\\"'], $string);
            return '"' . $escaped . '"';
        }

        return $string;
    }

    private static function detectEol(string $contents): string
    {
        if (str_contains($contents, "\r\n")) {
            return "\r\n";
        }

        return "\n";
    }
}

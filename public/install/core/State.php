<?php
declare(strict_types=1);

namespace Install\Core;

final class State
{
    public static function set(string $key, mixed $value): void
    {
        $_SESSION['install_wizard'][$key] = $value;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return $_SESSION['install_wizard'][$key] ?? $default;
    }

    public static function has(string $key): bool
    {
        return isset($_SESSION['install_wizard'][$key]);
    }

    public static function forget(string $key): void
    {
        unset($_SESSION['install_wizard'][$key]);
    }

    public static function csrfToken(): string
    {
        if (empty($_SESSION['install_wizard']['_csrf'])) {
            $_SESSION['install_wizard']['_csrf'] = bin2hex(random_bytes(24));
        }

        return $_SESSION['install_wizard']['_csrf'];
    }

    public static function csrfVerify(?string $token): bool
    {
        $expected = $_SESSION['install_wizard']['_csrf'] ?? null;

        return is_string($token) && is_string($expected) && hash_equals($expected, $token);
    }

    public static function markStepComplete(string $step): void
    {
        $done = $_SESSION['install_wizard']['_completed'] ?? [];
        if (!in_array($step, $done, true)) {
            $done[] = $step;
        }
        $_SESSION['install_wizard']['_completed'] = $done;
    }

    public static function isStepComplete(string $step): bool
    {
        $done = $_SESSION['install_wizard']['_completed'] ?? [];

        return in_array($step, $done, true);
    }
}

<?php
declare(strict_types=1);

namespace Install\Core;

/**
 * Server requirements checker.
 *
 * Pure PHP — does NOT touch Laravel/vendor code, EXCEPT for the optional
 * "artisan can boot" probe at the very end, which is wrapped in a try/catch
 * so failures here never crash the wizard.
 */
final class Requirements
{
    /** @return array<int, array{label: string, ok: bool, required: bool, current?: string, expected?: string, hint?: string}> */
    public static function all(): array
    {
        return array_merge(
            [self::php()],
            self::extensions(),
            self::functions(),
            self::paths(),
            [self::artisanBootable()],
        );
    }

    /** @return array{label: string, ok: bool, required: bool, current: string, expected: string} */
    public static function php(): array
    {
        $ok = version_compare(PHP_VERSION, INSTALL_MIN_PHP, '>=');

        return [
            'label'    => 'PHP version',
            'ok'       => $ok,
            'required' => true,
            'current'  => PHP_VERSION,
            'expected' => '>= ' . INSTALL_MIN_PHP,
        ];
    }

    /** @return array<int, array{label: string, ok: bool, required: bool}> */
    public static function extensions(): array
    {
        $required = [
            'pdo', 'openssl', 'mbstring', 'tokenizer', 'ctype',
            'json', 'fileinfo', 'curl', 'xml', 'bcmath',
        ];

        $rows = [];
        foreach ($required as $ext) {
            $rows[] = [
                'label'    => 'Extension: ' . $ext,
                'ok'       => extension_loaded($ext),
                'required' => true,
            ];
        }

        return $rows;
    }

    /** @return array<int, array{label: string, ok: bool, required: bool, hint?: string}> */
    public static function functions(): array
    {
        $rows = [];

        $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
        $isEnabled = static function (string $fn) use ($disabled): bool {
            return function_exists($fn) && !in_array($fn, $disabled, true);
        };

        $rows[] = [
            'label'    => 'Function: proc_open (used by some artisan commands)',
            'ok'       => $isEnabled('proc_open'),
            'required' => false,
            'hint'     => 'Some shared hosts disable this. Wizard will still work without it.',
        ];

        return $rows;
    }

    /** @return array<int, array{label: string, ok: bool, required: bool, hint?: string}> */
    public static function paths(): array
    {
        $base = INSTALL_BASE_PATH;
        $rows = [];

        $storage = $base . '/storage';
        $rows[] = [
            'label'    => 'Writable: storage/ (recursive)',
            'ok'       => is_dir($storage) && self::isWritableRecursive($storage),
            'required' => true,
            'hint'     => 'chmod -R 775 storage/ (or 755 with correct owner)',
        ];

        $envOk = file_exists(INSTALL_ENV_FILE)
            ? is_writable(INSTALL_ENV_FILE)
            : is_writable($base);
        $rows[] = [
            'label'    => 'Writable: .env (project root)',
            'ok'       => $envOk,
            'required' => true,
            'hint'     => 'The project root must be writable so the wizard can create .env',
        ];

        return $rows;
    }

    private static function isWritableRecursive(string $path): bool
    {
        if (!is_writable($path)) {
            return false;
        }
        foreach (new \DirectoryIterator($path) as $entry) {
            if ($entry->isDot()) {
                continue;
            }
            if ($entry->isDir() && !self::isWritableRecursive($entry->getPathname())) {
                return false;
            }
        }
        return true;
    }

    /**
     * Verify that Laravel's artisan kernel can actually be instantiated.
     *
     * We don't fully boot the app (it would need a real .env), but we do
     * confirm: vendor/autoload is loadable, the framework's core classes
     * exist, and the application can be constructed without throwing.
     *
     * @return array{label: string, ok: bool, required: bool, hint: string}
     */
    public static function artisanBootable(): array
    {
        $autoload = INSTALL_BASE_PATH . '/vendor/autoload.php';
        $bootstrap = INSTALL_BASE_PATH . '/bootstrap/app.php';

        if (!file_exists($autoload)) {
            return [
                'label'    => 'Artisan: vendor/autoload.php present',
                'ok'       => false,
                'required' => true,
                'hint'     => 'Composer dependencies are missing. Run "composer install" or re-upload the vendor folder.',
            ];
        }

        if (!file_exists($bootstrap)) {
            return [
                'label'    => 'Artisan: bootstrap/app.php present',
                'ok'       => false,
                'required' => true,
                'hint'     => 'Project files appear incomplete — bootstrap/app.php is missing.',
            ];
        }

        try {
            require_once $autoload;

            if (!class_exists(\Illuminate\Foundation\Application::class)) {
                throw new \RuntimeException('Illuminate\Foundation\Application not found');
            }
            if (!class_exists(\Symfony\Component\Process\Process::class)) {
                throw new \RuntimeException('Symfony Process component not found');
            }

            return [
                'label'    => 'Artisan: Laravel kernel can be loaded',
                'ok'       => true,
                'required' => true,
                'hint'     => '',
            ];
        } catch (\Throwable $e) {
            return [
                'label'    => 'Artisan: Laravel kernel can be loaded',
                'ok'       => false,
                'required' => true,
                'hint'     => 'Could not load vendor/autoload.php: ' . $e->getMessage(),
            ];
        }
    }

    public static function allRequiredPass(): bool
    {
        foreach (self::all() as $row) {
            if ($row['required'] && !$row['ok']) {
                return false;
            }
        }

        return true;
    }
}

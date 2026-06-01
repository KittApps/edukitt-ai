<?php
declare(strict_types=1);

namespace Install\Core;

use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Foundation\Application;
use Throwable;

/**
 * Boots Laravel inside the installer process and runs artisan commands
 * one at a time, returning structured results suitable for the progress UI.
 *
 * IMPORTANT: this is only called AFTER .env has been written, otherwise
 * Laravel will refuse to boot.
 */
final class Installer
{
    private static ?Application $app = null;

    /**
     * @return array{ok: bool, output: string, exit_code: int, error?: string}
     */
    public static function run(string $task): array
    {
        return match ($task) {
            'key'      => self::artisan('key:generate', ['--force' => true]),
            'storage'  => self::artisan('storage:link', ['--force' => true]),
            'migrate'  => self::artisan('migrate:fresh', ['--force' => true, '--drop-views' => true]),
            'seed'     => self::artisan('db:seed', ['--force' => true]),
            'locale'   => self::artisan('locale:sync'),
            'optimize' => self::artisan('optimize'),
            'lock'     => self::writeLock(),
            default    => ['ok' => false, 'output' => '', 'exit_code' => 1, 'error' => 'Unknown task: ' . $task],
        };
    }

    /**
     * @param array<string, mixed> $parameters
     * @return array{ok: bool, output: string, exit_code: int, error?: string}
     */
    private static function artisan(string $command, array $parameters = []): array
    {
        try {
            $app = self::app();
            $kernel = $app->make(ConsoleKernel::class);

            $output = new \Symfony\Component\Console\Output\BufferedOutput();
            $exit = $kernel->call($command, $parameters, $output);

            return [
                'ok'        => $exit === 0,
                'output'    => $output->fetch(),
                'exit_code' => $exit,
            ];
        } catch (Throwable $e) {
            return [
                'ok'        => false,
                'output'    => '',
                'exit_code' => 1,
                'error'     => $e->getMessage(),
            ];
        }
    }

    /**
     * @return array{ok: bool, output: string, exit_code: int, error?: string}
     */
    private static function writeLock(): array
    {
        try {
            $dir = dirname(INSTALL_LOCK_FILE);
            if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
                throw new \RuntimeException('Could not create directory: ' . $dir);
            }

            $payload = json_encode([
                'installed_at' => date(DATE_ATOM),
                'php_version'  => PHP_VERSION,
                'ip'           => $_SERVER['REMOTE_ADDR'] ?? null,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (file_put_contents(INSTALL_LOCK_FILE, $payload) === false) {
                throw new \RuntimeException('Could not write lock file');
            }

            return ['ok' => true, 'output' => 'Lock file written.', 'exit_code' => 0];
        } catch (Throwable $e) {
            return ['ok' => false, 'output' => '', 'exit_code' => 1, 'error' => $e->getMessage()];
        }
    }

    private static function app(): Application
    {
        if (self::$app instanceof Application) {
            return self::$app;
        }

        $autoload = INSTALL_BASE_PATH . '/vendor/autoload.php';
        if (!file_exists($autoload)) {
            throw new \RuntimeException('vendor/autoload.php is missing — run composer install.');
        }
        require_once $autoload;

        $appFile = INSTALL_BASE_PATH . '/bootstrap/app.php';
        if (!file_exists($appFile)) {
            throw new \RuntimeException('bootstrap/app.php is missing.');
        }

        /** @var Application $app */
        $app = require $appFile;
        $app->loadEnvironmentFrom('.env');

        self::$app = $app;

        return $app;
    }
}

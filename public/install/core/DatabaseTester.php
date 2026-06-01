<?php
declare(strict_types=1);

namespace Install\Core;

use PDO;
use PDOException;

/**
 * Tests a database connection using PDO directly — no Laravel needed.
 */
final class DatabaseTester
{
    /**
     * @param array{connection: string, host?: string, port?: string|int, database: string, username?: string, password?: string} $config
     * @return array{ok: bool, error?: string, driver_loaded?: bool}
     */
    public static function test(array $config): array
    {
        $connection = $config['connection'] ?? 'mysql';
        $driver = self::pdoDriver($connection);

        if (!in_array($driver, PDO::getAvailableDrivers(), true)) {
            return [
                'ok'             => false,
                'driver_loaded'  => false,
                'error'          => 'PDO driver "' . $driver . '" is not installed on this server. Enable the corresponding PHP extension.',
            ];
        }

        try {
            if ($connection === 'sqlite') {
                $path = $config['database'] ?? '';
                if ($path === '') {
                    return ['ok' => false, 'error' => 'SQLite file path is required.'];
                }
                if (!str_starts_with($path, '/') && !preg_match('/^[A-Z]:[\\\\\\/]/i', $path)) {
                    $path = INSTALL_BASE_PATH . '/' . ltrim($path, '/\\');
                }
                if (!file_exists($path)) {
                    $dir = dirname($path);
                    if (!is_dir($dir) || !is_writable($dir)) {
                        return ['ok' => false, 'error' => 'SQLite directory is not writable: ' . $dir];
                    }
                    if (!@touch($path)) {
                        return ['ok' => false, 'error' => 'Could not create SQLite file: ' . $path];
                    }
                }
                $dsn = 'sqlite:' . $path;
                $pdo = new PDO($dsn);
            } else {
                $host = $config['host'] ?? '127.0.0.1';
                $port = (string) ($config['port'] ?? ($connection === 'pgsql' ? '5432' : '3306'));
                $db   = $config['database'] ?? '';
                $user = $config['username'] ?? '';
                $pass = $config['password'] ?? '';

                if ($db === '') {
                    return ['ok' => false, 'error' => 'Database name is required.'];
                }

                $dsn = sprintf('%s:host=%s;port=%s;dbname=%s;charset=utf8mb4', $driver, $host, $port, $db);
                if ($driver === 'pgsql') {
                    $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $host, $port, $db);
                }

                $pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 5,
                ]);
            }

            $pdo->query('SELECT 1');

            return ['ok' => true, 'driver_loaded' => true];
        } catch (PDOException $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private static function pdoDriver(string $connection): string
    {
        return match ($connection) {
            'pgsql'   => 'pgsql',
            'sqlite'  => 'sqlite',
            'sqlsrv'  => 'sqlsrv',
            default   => 'mysql',
        };
    }
}

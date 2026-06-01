<?php
declare(strict_types=1);

/**
 * Installation Wizard - AJAX bootstrap.
 * Modern PHP entry point for /public/install/api.php?action=...
 */

define('INSTALL_DIR', __DIR__);
define('INSTALL_BASE_PATH', dirname(__DIR__, 2));
define('INSTALL_LOCK_FILE', INSTALL_BASE_PATH . '/storage/app/installed.lock');
define('INSTALL_ENV_FILE', INSTALL_BASE_PATH . '/.env');
define('INSTALL_ENV_EXAMPLE', INSTALL_BASE_PATH . '/.env.example');
define('INSTALL_MIN_PHP', '8.3.0');

if (session_status() === PHP_SESSION_NONE) {
    session_name('install_wizard');
    session_start();
}

require __DIR__ . '/core/State.php';
require __DIR__ . '/core/Requirements.php';
require __DIR__ . '/core/EnvWriter.php';
require __DIR__ . '/core/DatabaseTester.php';
require __DIR__ . '/core/Installer.php';

use Install\Core\DatabaseTester;
use Install\Core\EnvWriter;
use Install\Core\Installer;
use Install\Core\State;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$respond = static function (array $payload, int $code = 200): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
};

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    $respond(['ok' => false, 'error' => 'POST required'], 405);
}

$rawBody = file_get_contents('php://input') ?: '';
$body = json_decode($rawBody, true);
if (!is_array($body)) {
    $body = $_POST;
}

$token = $body['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
if (!State::csrfVerify(is_string($token) ? $token : null)) {
    $respond(['ok' => false, 'error' => 'Invalid CSRF token. Reload the page and try again.'], 419);
}

$action = preg_replace('/[^a-z_-]/', '', strtolower((string) ($_GET['action'] ?? '')));

try {
    match ($action) {
        'test-db'      => $respond(handle_test_db($body)),
        'save-db'      => $respond(handle_save_db($body)),
        'save-app'     => $respond(handle_save_app($body)),
        'run'          => $respond(handle_run($body)),
        default        => $respond(['ok' => false, 'error' => 'Unknown action: ' . $action], 400),
    };
} catch (Throwable $e) {
    $respond(['ok' => false, 'error' => $e->getMessage()], 500);
}

function handle_test_db(array $body): array
{
    $config = normalize_db_payload($body);
    $result = DatabaseTester::test($config);

    return $result['ok']
        ? ['ok' => true, 'message' => 'Connection successful.']
        : ['ok' => false, 'error' => $result['error'] ?? 'Connection failed.'];
}

function handle_save_db(array $body): array
{
    $config = normalize_db_payload($body);
    $test = DatabaseTester::test($config);
    if (!$test['ok']) {
        return ['ok' => false, 'error' => $test['error'] ?? 'Connection failed.'];
    }

    $pairs = match ($config['connection']) {
        'sqlite' => [
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE'   => relative_sqlite_path($body['sqlite_path'] ?? 'database/database.sqlite'),
            'DB_PREFIX'     => $config['prefix'] ?? '',
        ],
        default => [
            'DB_CONNECTION' => $config['connection'],
            'DB_HOST'       => $config['host'],
            'DB_PORT'       => (string) $config['port'],
            'DB_DATABASE'   => $config['database'],
            'DB_USERNAME'   => $config['username'],
            'DB_PASSWORD'   => $config['password'],
            'DB_PREFIX'     => $config['prefix'] ?? '',
        ],
    };

    if (!EnvWriter::set($pairs)) {
        return ['ok' => false, 'error' => 'Could not write .env file.'];
    }

    State::set('db', $config + ['sqlite_path' => $body['sqlite_path'] ?? null, 'password' => '']);
    State::markStepComplete('database');

    return ['ok' => true, 'next' => '?step=app'];
}

function handle_save_app(array $body): array
{
    if (!State::isStepComplete('database')) {
        return ['ok' => false, 'error' => 'Complete the database step first.'];
    }

    $name = trim((string) ($body['app_name'] ?? ''));
    $url  = trim((string) ($body['app_url']  ?? ''));

    if ($name === '') {
        return ['ok' => false, 'error' => 'Site name is required.'];
    }
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return ['ok' => false, 'error' => 'Site URL is invalid. Include http:// or https://'];
    }
    $url = rtrim($url, '/');

    if (!EnvWriter::set(['APP_NAME' => $name, 'APP_URL' => $url, 'APP_ENV' => 'production', 'APP_DEBUG' => false])) {
        return ['ok' => false, 'error' => 'Could not write .env file.'];
    }

    State::set('app', ['app_name' => $name, 'app_url' => $url]);
    State::set('app.url', $url);
    State::markStepComplete('app');

    return ['ok' => true, 'next' => '?step=finalize'];
}

function handle_run(array $body): array
{
    if (!State::isStepComplete('app')) {
        return ['ok' => false, 'error' => 'Complete previous steps first.'];
    }

    $task = preg_replace('/[^a-z]/', '', strtolower((string) ($body['task'] ?? '')));
    $allowed = ['key', 'storage', 'migrate', 'seed', 'locale', 'optimize', 'lock'];
    if (!in_array($task, $allowed, true)) {
        return ['ok' => false, 'error' => 'Unknown task: ' . $task];
    }

    @set_time_limit(300);

    $result = Installer::run($task);

    if ($task === 'lock' && $result['ok']) {
        State::markStepComplete('finalize');
    }

    return $result;
}

function normalize_db_payload(array $body): array
{
    $connection = in_array($body['connection'] ?? 'mysql', ['mysql', 'pgsql', 'sqlite', 'sqlsrv'], true)
        ? $body['connection']
        : 'mysql';

    if ($connection === 'sqlite') {
        $path = (string) ($body['sqlite_path'] ?? 'database/database.sqlite');
        if (!str_starts_with($path, '/') && !preg_match('/^[A-Z]:[\\\\\\/]/i', $path)) {
            $path = INSTALL_BASE_PATH . '/' . ltrim($path, '/\\');
        }
        return ['connection' => 'sqlite', 'database' => $path, 'prefix' => (string) ($body['prefix'] ?? '')];
    }

    return [
        'connection' => $connection,
        'host'       => (string) ($body['host'] ?? '127.0.0.1'),
        'port'       => (string) ($body['port'] ?? ($connection === 'pgsql' ? '5432' : '3306')),
        'database'   => (string) ($body['database'] ?? ''),
        'username'   => (string) ($body['username'] ?? ''),
        'password'   => (string) ($body['password'] ?? ''),
        'prefix'     => (string) ($body['prefix']   ?? ''),
    ];
}

function relative_sqlite_path(string $path): string
{
    $path = str_replace('\\', '/', $path);
    $base = str_replace('\\', '/', INSTALL_BASE_PATH) . '/';
    if (str_starts_with($path, $base)) {
        $path = substr($path, strlen($base));
    }
    return $path;
}

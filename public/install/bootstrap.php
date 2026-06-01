<?php
declare(strict_types=1);

/**
 * Installation Wizard - Modern PHP Bootstrap.
 *
 * Reached only after public/install/index.php confirms PHP >= 8.3.
 * Sets up shared constants, session, helpers, autoload for core classes,
 * then renders the requested step inside the wizard layout.
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

$steps = [
    'welcome'      => ['label' => 'Welcome',      'num' => 1],
    'requirements' => ['label' => 'Requirements', 'num' => 2],
    'database'     => ['label' => 'Database',     'num' => 3],
    'app'          => ['label' => 'App Settings', 'num' => 4],
    'finalize'     => ['label' => 'Install',      'num' => 5],
    'done'         => ['label' => 'Finish',       'num' => 6],
];

$requested = $_GET['step'] ?? 'welcome';
$requested = preg_replace('/[^a-z_]/', '', strtolower((string) $requested));
$step = array_key_exists($requested, $steps) ? $requested : 'welcome';

$alreadyInstalled = file_exists(INSTALL_LOCK_FILE);
$forced = ($_GET['force'] ?? '') === '1';

if ($alreadyInstalled && !$forced && $step !== 'done') {
    $currentStep = 'already_installed';
    require __DIR__ . '/partials/layout.php';
    exit;
}

$currentStep = $step;
require __DIR__ . '/partials/layout.php';

<?php
/**
 * Installation Wizard - AJAX endpoints
 * ---------------------------------------------------------------------------
 * Like index.php, this file must remain PHP 5.6-compatible for the version
 * gate; everything after the gate is in modern PHP via bootstrap.php.
 * ---------------------------------------------------------------------------
 */

$REQUIRED_PHP = '8.3.0';
if (version_compare(PHP_VERSION, $REQUIRED_PHP, '<')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array(
        'ok'    => false,
        'error' => 'PHP ' . $REQUIRED_PHP . '+ required (you have ' . PHP_VERSION . ')',
    ));
    exit;
}

require __DIR__ . '/bootstrap_api.php';

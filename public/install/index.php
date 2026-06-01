<?php
/**
 * Installation Wizard - Entry Point
 * ---------------------------------------------------------------------------
 * IMPORTANT: This file MUST stay compatible with PHP 5.6+.
 *
 * Do NOT add type hints, return types, arrow functions, match expressions,
 * enums, null-safe operators, readonly properties, named arguments, or any
 * other syntax introduced after PHP 5.6. Its only job is to gate the
 * request behind a PHP version check and hand off to bootstrap.php, which
 * is free to use modern syntax.
 * ---------------------------------------------------------------------------
 */

$REQUIRED_PHP = '8.3.0';

// Normalize the URL so /install always behaves like /install/.
// Without a trailing slash, the browser resolves relative asset URLs
// (./assets/style.css, ./logo.png, api.php) against the parent path,
// producing 404s. Apache adds this slash automatically; PHP's built-in
// dev server (and some cheap hosts) do not, so we do it explicitly.
$requestUri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$urlPath = parse_url($requestUri, PHP_URL_PATH);
if ($urlPath === null) {
    $urlPath = '/';
}
$lastSegment = basename($urlPath);
if (substr($urlPath, -1) !== '/' && strpos($lastSegment, '.') === false) {
    $qs = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
        ? '?' . $_SERVER['QUERY_STRING']
        : '';
    header('Location: ' . $urlPath . '/' . $qs, true, 301);
    exit;
}

if (version_compare(PHP_VERSION, $REQUIRED_PHP, '<')) {
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    $current = PHP_VERSION;
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>PHP Upgrade Required</title>';
    echo '<style>'
        . 'body{font-family:"Inter",Segoe UI,Arial,sans-serif;background:#f2f3f3;color:#16191f;margin:0;padding:64px 16px;}'
        . '.box{max-width:560px;margin:0 auto;background:#fff;border:1px solid #d5dbdb;padding:32px;}'
        . '.h{font-weight:700;font-size:20px;color:#0972d3;margin:0 0 12px;}'
        . '.p{font-size:14px;line-height:1.6;margin:0 0 12px;color:#16191f;}'
        . '.k{font-family:"SFMono-Regular",Consolas,monospace;background:#eaeded;padding:2px 6px;font-size:13px;}'
        . '</style></head><body><div class="box">';
    echo '<div class="h">PHP Upgrade Required</div>';
    echo '<p class="p">This application needs PHP <span class="k">' . htmlspecialchars($REQUIRED_PHP) . '</span> or newer to install.</p>';
    echo '<p class="p">PHP version detected on this server: <span class="k">' . htmlspecialchars($current) . '</span></p>';
    echo '<p class="p">Please ask your hosting provider to upgrade PHP, then reload this page.</p>';
    echo '</div></body></html>';
    exit;
}

require __DIR__ . '/bootstrap.php';

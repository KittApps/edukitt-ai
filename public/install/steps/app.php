<?php
declare(strict_types=1);

use Install\Core\State;

if (!State::isStepComplete('database')) {
    echo '<div class="wiz-callout wiz-callout--bad">Please complete the <a href="?step=database">database step</a> first.</div>';
    return;
}

$saved = State::get('app', []);
$detectedUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
    . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
?>
<div class="wiz-step-content">
    <h1 class="wiz-h1">App settings</h1>
    <p class="wiz-lede">A couple of essentials and we'll be ready to run the installation.</p>

    <form id="app-form" class="wiz-form" autocomplete="off" data-action="save-app">
        <div class="wiz-form-row">
            <label class="wiz-label" for="app_name">Site name</label>
            <input id="app_name" name="app_name" class="wiz-input" value="<?= htmlspecialchars($saved['app_name'] ?? '') ?>" placeholder="My Awesome Site" required>
            <p class="wiz-help">Shown in the browser tab, emails, and throughout the app.</p>
        </div>

        <div class="wiz-form-row">
            <label class="wiz-label" for="app_url">Site URL</label>
            <input id="app_url" name="app_url" class="wiz-input" value="<?= htmlspecialchars($saved['app_url'] ?? $detectedUrl) ?>" placeholder="https://example.com" required>
            <p class="wiz-help">Public URL where users will reach the app. No trailing slash.</p>
        </div>

        <div id="app-result" class="wiz-result" hidden></div>

        <div class="wiz-actions">
            <a class="wiz-btn wiz-btn--ghost" href="?step=database">&larr; Back</a>
            <button type="submit" class="wiz-btn wiz-btn--primary">Save &amp; continue &rarr;</button>
        </div>
    </form>
</div>

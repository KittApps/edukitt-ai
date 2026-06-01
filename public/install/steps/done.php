<?php
declare(strict_types=1);

use Install\Core\State;

$appUrl = State::get('app.url', '/');
?>
<div class="wiz-step-content wiz-done">
    <div class="wiz-done-mark" aria-hidden="true">&#10003;</div>
    <h1 class="wiz-h1">All done!</h1>
    <p class="wiz-lede">
        Your application is installed and ready to use.
    </p>

    <div class="wiz-callout">
        <strong>One last thing:</strong> for security, please delete the
        <code>public/install</code> folder from your server. The installer is no longer needed
        and removing it prevents anyone from re-running the wizard.
    </div>

    <div class="wiz-actions wiz-actions--center">
        <a class="wiz-btn wiz-btn--primary" href="<?= htmlspecialchars($appUrl) ?>">Go to your site &rarr;</a>
    </div>
</div>

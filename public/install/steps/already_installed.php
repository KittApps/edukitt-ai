<?php
declare(strict_types=1);
?>
<div class="wiz-step-content wiz-done">
    <div class="wiz-done-mark wiz-done-mark--info" aria-hidden="true">i</div>
    <h1 class="wiz-h1">Already installed</h1>
    <p class="wiz-lede">
        This application is already installed on this server. For security we recommend
        deleting the <code>public/install</code> folder so the wizard can't be re-run.
    </p>

    <div class="wiz-callout wiz-callout--bad">
        Running the installer again may overwrite your <code>.env</code> file and re-run migrations.
        Only proceed if you know what you're doing.
    </div>

    <div class="wiz-actions">
        <a class="wiz-btn wiz-btn--primary" href="../../">Go to your site &rarr;</a>
        <a class="wiz-btn wiz-btn--ghost" href="?step=welcome&amp;force=1">Re-run wizard anyway</a>
    </div>
</div>

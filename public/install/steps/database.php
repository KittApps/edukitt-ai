<?php
declare(strict_types=1);

use Install\Core\State;

if (!State::isStepComplete('requirements')) {
    echo '<div class="wiz-callout wiz-callout--bad">Please complete the <a href="?step=requirements">requirements check</a> first.</div>';
    return;
}

$saved = State::get('db', []);
?>
<div class="wiz-step-content">
    <h1 class="wiz-h1">Database connection</h1>
    <p class="wiz-lede">Enter your database credentials. We'll test the connection before continuing.</p>

    <form id="db-form" class="wiz-form" autocomplete="off" data-action="save-db">
        <div class="wiz-form-row">
            <label class="wiz-label" for="db_connection">Driver</label>
            <select id="db_connection" name="connection" class="wiz-input">
                <option value="mysql"  <?= ($saved['connection'] ?? 'mysql') === 'mysql' ? 'selected' : '' ?>>MySQL / MariaDB</option>
                <option value="pgsql"  <?= ($saved['connection'] ?? '') === 'pgsql' ? 'selected' : '' ?>>PostgreSQL</option>
                <option value="sqlite" <?= ($saved['connection'] ?? '') === 'sqlite' ? 'selected' : '' ?>>SQLite</option>
            </select>
        </div>

        <div data-driver-fields="server">
            <div class="wiz-form-grid">
                <div class="wiz-form-row">
                    <label class="wiz-label" for="db_host">Host</label>
                    <input id="db_host" name="host" class="wiz-input" value="<?= htmlspecialchars($saved['host'] ?? '127.0.0.1') ?>" placeholder="127.0.0.1">
                </div>
                <div class="wiz-form-row">
                    <label class="wiz-label" for="db_port">Port</label>
                    <input id="db_port" name="port" class="wiz-input" value="<?= htmlspecialchars($saved['port'] ?? '3306') ?>" placeholder="3306">
                </div>
            </div>

            <div class="wiz-form-row">
                <label class="wiz-label" for="db_database">Database name</label>
                <input id="db_database" name="database" class="wiz-input" value="<?= htmlspecialchars($saved['database'] ?? '') ?>" placeholder="my_database" required>
            </div>

            <div class="wiz-form-grid">
                <div class="wiz-form-row">
                    <label class="wiz-label" for="db_username">Username</label>
                    <input id="db_username" name="username" class="wiz-input" value="<?= htmlspecialchars($saved['username'] ?? 'root') ?>" placeholder="root">
                </div>
                <div class="wiz-form-row">
                    <label class="wiz-label" for="db_password">Password</label>
                    <input id="db_password" name="password" type="password" class="wiz-input" value="" placeholder="••••••••">
                </div>
            </div>

            <div class="wiz-form-row">
                <label class="wiz-label" for="db_prefix">Table prefix (optional)</label>
                <input id="db_prefix" name="prefix" class="wiz-input" value="<?= htmlspecialchars($saved['prefix'] ?? 'ek_') ?>" placeholder="ek_">
                <p class="wiz-help">Applied to every table. Useful when sharing one database with other apps.</p>
            </div>
        </div>

        <div data-driver-fields="sqlite" hidden>
            <div class="wiz-form-row">
                <label class="wiz-label" for="db_sqlite_path">SQLite file path</label>
                <input id="db_sqlite_path" name="sqlite_path" class="wiz-input" value="<?= htmlspecialchars($saved['sqlite_path'] ?? 'database/database.sqlite') ?>" placeholder="database/database.sqlite">
                <p class="wiz-help">Relative to the project root. Will be created if it doesn't exist.</p>
            </div>
        </div>

        <div id="db-result" class="wiz-result" hidden></div>

        <div class="wiz-actions">
            <a class="wiz-btn wiz-btn--ghost" href="?step=requirements">&larr; Back</a>
            <div>
                <button type="button" class="wiz-btn wiz-btn--ghost" data-action-button="test-db">Test connection</button>
                <button type="submit" class="wiz-btn wiz-btn--primary">Save &amp; continue &rarr;</button>
            </div>
        </div>
    </form>
</div>

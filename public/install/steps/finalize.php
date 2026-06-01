<?php
declare(strict_types=1);

use Install\Core\State;

if (!State::isStepComplete('app')) {
    echo '<div class="wiz-callout wiz-callout--bad">Please complete the <a href="?step=app">app settings step</a> first.</div>';
    return;
}

$tasks = [
    ['id' => 'key',      'label' => 'Generate application key'],
    ['id' => 'storage',  'label' => 'Link public storage'],
    ['id' => 'migrate',  'label' => 'Run database migrations'],
    ['id' => 'seed',     'label' => 'Seed default data'],
    ['id' => 'locale',   'label' => 'Sync localization keys'],
    ['id' => 'optimize', 'label' => 'Optimize Laravel cache'],
    ['id' => 'lock',     'label' => 'Finalize installation'],
];
?>
<div class="wiz-step-content">
    <h1 class="wiz-h1">Install</h1>
    <p class="wiz-lede">
        Press the button below to run the installation. Each task runs in order; if anything fails
        you'll see the error inline and can fix it before retrying.
    </p>

    <ul id="task-list" class="wiz-tasks">
        <?php foreach ($tasks as $task): ?>
            <li class="wiz-task" data-task="<?= htmlspecialchars($task['id']) ?>">
                <span class="wiz-task-icon" aria-hidden="true"></span>
                <span class="wiz-task-label"><?= htmlspecialchars($task['label']) ?></span>
                <span class="wiz-task-state">Pending</span>
            </li>
        <?php endforeach; ?>
    </ul>

    <div id="finalize-error" class="wiz-callout wiz-callout--bad" hidden></div>

    <div class="wiz-actions">
        <a class="wiz-btn wiz-btn--ghost" href="?step=app">&larr; Back</a>
        <button id="run-install" class="wiz-btn wiz-btn--primary" data-action-button="run-install">
            Start installation
        </button>
    </div>
</div>

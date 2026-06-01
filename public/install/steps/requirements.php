<?php
declare(strict_types=1);

use Install\Core\Requirements;
use Install\Core\State;

$rows = Requirements::all();
$allPass = Requirements::allRequiredPass();
if ($allPass) {
    State::markStepComplete('requirements');
}
?>
<div class="wiz-step-content">
    <h1 class="wiz-h1">Server requirements</h1>
    <p class="wiz-lede">
        We verified your server meets every requirement. Items marked
        <span class="wiz-badge wiz-badge--ok">OK</span> are good to go.
        <span class="wiz-badge wiz-badge--fail">FAIL</span> means a required item must be fixed before continuing.
    </p>

    <table class="wiz-table">
        <thead>
            <tr>
                <th>Check</th>
                <th class="wiz-table-meta">Detected</th>
                <th class="wiz-table-meta">Expected</th>
                <th class="wiz-table-status">Status</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($rows as $row): ?>
                <?php
                $cls = $row['ok']
                    ? 'wiz-badge--ok'
                    : ($row['required'] ? 'wiz-badge--fail' : 'wiz-badge--warn');
                $text = $row['ok'] ? 'OK' : ($row['required'] ? 'FAIL' : 'WARN');
                ?>
                <tr class="<?= $row['ok'] ? '' : 'wiz-row--bad' ?>">
                    <td>
                        <?= htmlspecialchars($row['label']) ?>
                        <?php if (!empty($row['hint']) && !$row['ok']): ?>
                            <div class="wiz-table-hint"><?= htmlspecialchars($row['hint']) ?></div>
                        <?php endif; ?>
                    </td>
                    <td class="wiz-table-meta"><?= htmlspecialchars($row['current'] ?? '—', ENT_QUOTES) ?></td>
                    <td class="wiz-table-meta"><?= htmlspecialchars($row['expected'] ?? '—', ENT_QUOTES) ?></td>
                    <td class="wiz-table-status">
                        <span class="wiz-badge <?= $cls ?>"><?= $text ?></span>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <?php if (!$allPass): ?>
        <div class="wiz-callout wiz-callout--bad">
            One or more required checks failed. Fix the items above and reload this page.
        </div>
    <?php endif; ?>

    <div class="wiz-actions">
        <a class="wiz-btn wiz-btn--ghost" href="?step=welcome">&larr; Back</a>
        <div>
            <a class="wiz-btn wiz-btn--ghost" href="?step=requirements">Re-check</a>
            <?php if ($allPass): ?>
                <a class="wiz-btn wiz-btn--primary" href="?step=database">Continue &rarr;</a>
            <?php else: ?>
                <button class="wiz-btn wiz-btn--primary" disabled>Continue &rarr;</button>
            <?php endif; ?>
        </div>
    </div>
</div>

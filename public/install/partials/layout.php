<?php
declare(strict_types=1);

use Install\Core\State;

/** @var array<string, array{label: string, num: int}> $steps */
/** @var string $currentStep */

$csrf = State::csrfToken();
$assetBase = './assets';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="<?= htmlspecialchars($csrf) ?>">
    <title>EduKitt Installation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap">
    <link rel="stylesheet" href="<?= $assetBase ?>/style.css">
</head>
<body class="install-app">
<div class="wiz-shell">
    <header class="wiz-header">
        <div class="wiz-brand">
            <img class="wiz-brand-logo" src="./logo.png" alt="EduKitt">
            <div>
                <div class="wiz-brand-title">EduKitt Installation</div>
                <div class="wiz-brand-sub">Set up your application in a few quick steps</div>
            </div>
        </div>
    </header>

    <main class="wiz-card" role="main">
        <?php if ($currentStep !== 'already_installed'): ?>
            <nav class="wiz-steps" aria-label="Installation progress">
                <?php $activeNum = $steps[$currentStep]['num'] ?? 1; ?>
                <?php foreach ($steps as $key => $meta): ?>
                    <?php
                    $state = 'pending';
                    if ($meta['num'] < $activeNum) { $state = 'done'; }
                    if ($meta['num'] === $activeNum) { $state = 'active'; }
                    ?>
                    <div class="wiz-step wiz-step--<?= $state ?>">
                        <span class="wiz-step-num"><?= $meta['num'] ?></span>
                        <span class="wiz-step-label"><?= htmlspecialchars($meta['label']) ?></span>
                    </div>
                <?php endforeach; ?>
            </nav>
        <?php endif; ?>

        <section class="wiz-body">
            <?php
            $stepFile = __DIR__ . '/../steps/' . preg_replace('/[^a-z_]/', '', $currentStep) . '.php';
            if (file_exists($stepFile)) {
                require $stepFile;
            } else {
                echo '<p class="wiz-error">Unknown step.</p>';
            }
            ?>
        </section>
    </main>

    <footer class="wiz-footer">
        <span>&copy; <?= date('Y') ?> &middot; Concept &amp; Developed by <a class="wiz-footer-link" href="https://hellokitt.com" target="_blank" rel="noopener noreferrer">HelloKitt</a></span>
        <span class="wiz-footer-sep">&middot;</span>
        <span>PHP <?= htmlspecialchars(PHP_VERSION) ?></span>
    </footer>
</div>
<script src="<?= $assetBase ?>/app.js" defer></script>
</body>
</html>

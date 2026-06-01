<?php

/**
 * EduKitt AI — Free Edition
 *
 * Copyright (c) 2026 Kitt Apps
 * https://kittapps.com
 *
 * Licensed under the EduKitt AI Free Edition License.
 * See LICENSE in the project root.
 */

namespace App\Console\Commands;

use App\Models\Language;
use App\Models\Translation;
use App\Models\TranslationKey;
use App\Services\LocalizationService;
use Generator;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

class SyncLocaleCommand extends Command
{
    protected $signature = 'locale:sync
        {--dry-run : Preview changes without writing to the database}
        {--prune : Report keys not seen in this scan as stale}';

    protected $description = 'Scan the codebase for t(\'key\', \'Source\') calls and sync keys into the database.';

    /**
     * Paths to scan, relative to base path.
     *
     * @var array<int, string>
     */
    protected array $scanPaths = [
        'resources/js',
        'resources/views',
        'app/Http',
        'app/Models',
        'app/Notifications',
        'app/Mail',
        'app/Rules',
        'app/Services',
    ];

    /**
     * Key groups skipped during sync — extracted matches in these
     * groups are ignored and existing rows are excluded from the
     * prune sweep so their `last_seen_in_code_at` doesn't go stale.
     * Empty this array to re-enable syncing the group.
     *
     * @var array<int, string>
     */
    protected array $excludedGroups = [
        'admin',
    ];

    /**
     * Source-language directory for Laravel's built-in messages
     * (auth/validation/passwords/pagination). Published once via
     * `php artisan lang:publish`. Used so framework-side strings
     * surfaced through trans()/__() (login failures, validation
     * rules, password reset statuses, …) appear in the localization
     * admin UI alongside the t()-derived keys.
     */
    protected string $frameworkLangDir = 'lang/en';

    /**
     * Whole framework groups whose every key gets imported as-is.
     * Used for small, fully-relevant sets (auth + password broker).
     *
     * @var array<int, string>
     */
    protected array $frameworkLangAllowedGroups = [
        'auth',
        'passwords',
    ];

    /**
     * Per-key allowlist for `validation.*`. Laravel ships ~135 rules
     * but the app only actually triggers the handful below (auth,
     * registration, profile, password reset forms). Anything not
     * listed here is left to fall back to Laravel's English default
     * via {@see \App\Services\Localization\DatabaseTranslator}, which
     * keeps the admin UI uncluttered.
     *
     * Add a key here + re-run `php artisan locale:sync` when a new
     * rule starts being used.
     *
     * @var array<int, string>
     */
    protected array $frameworkLangAllowedKeys = [
        'validation.required',
        'validation.string',
        'validation.email',
        'validation.lowercase',
        'validation.max.string',
        'validation.min.string',
        'validation.unique',
        'validation.confirmed',
        'validation.current_password',
        'validation.password.letters',
        'validation.password.mixed',
        'validation.password.numbers',
        'validation.password.symbols',
        'validation.password.uncompromised',
    ];

    /**
     * Regex capturing `t('dotted.key', 'Source text')` in JS/TS and PHP.
     * First arg: dotted key (at least one dot), second arg: optional source string.
     *
     * Uses backreferences (\1, \3) to match the *same* quote style that
     * opened each string. The content class is "anything that is not the
     * opening quote or a backslash", so a double-quoted fallback can
     * legally contain an apostrophe (e.g. "If you didn't request..."),
     * which the older symmetric regex incorrectly truncated.
     *
     * Supports single quotes, double quotes, and backticks (JS template
     * literals without interpolation).
     */
    protected string $callPattern = '/\bt\(\s*([\'"`])([\w]+(?:\.[\w]+)+)\1(?:\s*,\s*([\'"`])((?:(?!\3)[^\\\\]|\\\\.)*)\3)?/';

    public function handle(LocalizationService $service): int
    {
        $this->info('Scanning codebase for translation keys...');

        $filesScanned = 0;
        $found = [];

        foreach ($this->scanPaths as $relative) {
            $absolute = base_path($relative);
            if (!is_dir($absolute)) {
                continue;
            }

            foreach ($this->walk($absolute) as $file) {
                $filesScanned++;
                foreach ($this->extractFromFile($file) as $entry) {
                    $k = $entry['key'];
                    if (in_array(TranslationKey::deriveGroup($k), $this->excludedGroups, true)) {
                        continue;
                    }
                    if (!isset($found[$k])) {
                        $found[$k] = $entry;
                    } elseif (empty($found[$k]['source']) && !empty($entry['source'])) {
                        $found[$k] = $entry;
                    }
                }
            }
        }

        $codeKeyCount = count($found);
        $frameworkKeyCount = $this->importFrameworkLangKeys($found);

        $uniqueCount = count($found);
        $skippedNote = empty($this->excludedGroups)
            ? ''
            : ' (excluded groups: '.implode(', ', $this->excludedGroups).')';
        $this->info(sprintf(
            'Scanned %d files, found %d code key(s) + %d framework key(s) = %d unique%s.',
            $filesScanned,
            $codeKeyCount,
            $frameworkKeyCount,
            $uniqueCount,
            $skippedNote,
        ));

        if ($this->option('dry-run')) {
            foreach ($found as $key => $entry) {
                $source = $entry['source'] ?? '(derived from key)';
                $this->line("  • {$key}  →  {$source}");
            }
            $this->warn('Dry-run: no writes.');
            return self::SUCCESS;
        }

        $now = now();
        $added = 0;
        $refreshed = 0;

        foreach ($found as $key => $entry) {
            $source = $entry['source'] ?? $this->humanize($key);
            $placeholders = TranslationKey::extractPlaceholders($source);
            $group = TranslationKey::deriveGroup($key);

            $existing = TranslationKey::where('key', $key)->first();

            if ($existing) {
                $existing->update([
                    'group' => $group,
                    'source' => $source,
                    'placeholders' => $placeholders,
                    'is_auto_synced' => true,
                    'last_seen_in_code_at' => $now,
                ]);
                $refreshed++;
            } else {
                TranslationKey::create([
                    'group' => $group,
                    'key' => $key,
                    'source' => $source,
                    'placeholders' => $placeholders,
                    'is_auto_synced' => true,
                    'last_seen_in_code_at' => $now,
                ]);
                $added++;
            }
        }

        // Drop framework rows that fell out of the allowlist (e.g.
        // a previously-imported validation.alpha_dash that's no
        // longer in $frameworkLangAllowedKeys). Always-on so the
        // DB never holds orphaned framework noise.
        $frameworkPruned = $this->pruneStaleFrameworkKeys();

        // Rewrite any :placeholder tokens still sitting in
        // translation values for framework keys to {placeholder}.
        // Idempotent: a no-op after the first run. Needed because
        // translations that were AI-generated before the source
        // normalisation otherwise show a "Missing placeholder"
        // warning in the admin editor.
        $frameworkValuesNormalised = $this->normaliseFrameworkTranslationValues();

        $stale = 0;
        if ($this->option('prune')) {
            $stale = TranslationKey::query()
                ->where('is_auto_synced', true)
                ->whereNotIn('group', $this->excludedGroups)
                ->where(function ($q) use ($now) {
                    $q->whereNull('last_seen_in_code_at')
                        ->orWhere('last_seen_in_code_at', '<', $now);
                })
                ->count();
        }

        Language::query()->where('is_default', true)->update(['last_synced_at' => $now]);

        $service->forgetCache();

        $this->newLine();
        $this->info(sprintf(
            'Sync complete · %d added · %d refreshed · %d framework pruned · %d values normalised%s',
            $added,
            $refreshed,
            $frameworkPruned,
            $frameworkValuesNormalised,
            $this->option('prune') ? " · {$stale} stale" : '',
        ));

        return self::SUCCESS;
    }

    /** @return iterable<string> */
    private function walk(string $dir): iterable
    {
        $iter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        );

        /** @var SplFileInfo $file */
        foreach ($iter as $file) {
            if (!$file->isFile()) {
                continue;
            }
            if (!preg_match('/\.(tsx|ts|jsx|js|php)$/', $file->getFilename())) {
                continue;
            }
            yield $file->getPathname();
        }
    }

    /**
     * @return array<int, array{key: string, source: ?string}>
     */
    private function extractFromFile(string $path): array
    {
        $contents = @file_get_contents($path);
        if ($contents === false) {
            return [];
        }

        preg_match_all($this->callPattern, $contents, $matches, PREG_SET_ORDER);

        $out = [];
        foreach ($matches as $m) {
            // Capture index map (after switching to quote-tracking
            // backreferences): 1 = key open-quote, 2 = key body,
            // 3 = source open-quote, 4 = source body.
            $out[] = [
                'key' => $m[2],
                'source' => isset($m[4]) && $m[4] !== '' ? stripcslashes($m[4]) : null,
            ];
        }

        return $out;
    }

    private function humanize(string $key): string
    {
        $last = str_contains($key, '.') ? substr($key, strrpos($key, '.') + 1) : $key;
        $words = str_replace(['_', '-'], ' ', $last);
        return ucfirst($words);
    }

    /**
     * Merge allowlisted keys from Laravel's published lang/en/*.php
     * files into the $found map so framework messages reach the
     * DB-backed dictionary and the localization admin UI. Two
     * normalisations happen here:
     *
     *  - Placeholder syntax is converted from Laravel's `:attribute`
     *    style to the app-wide `{attribute}` style. The DB stays
     *    single-style which keeps the placeholder UI, the AI
     *    auto-translator prompt, and the missing-placeholder
     *    validator uniform. {@see \App\Services\Localization\DatabaseTranslator}
     *    handles the round-trip back to colon-style for Laravel's
     *    validator.
     *  - Only keys allowed by {@see $frameworkLangAllowedGroups} /
     *    {@see $frameworkLangAllowedKeys} are imported; everything
     *    else is left to Laravel's file-loader fallback.
     *
     * Existing entries from t() calls win — we only fill the gaps.
     *
     * @param  array<string, array{key: string, source: ?string}>  $found
     * @return int  Number of framework keys added to $found.
     */
    private function importFrameworkLangKeys(array &$found): int
    {
        $dir = base_path($this->frameworkLangDir);
        if (! is_dir($dir)) {
            return 0;
        }

        $added = 0;

        foreach (glob($dir.'/*.php') ?: [] as $file) {
            $group = pathinfo($file, PATHINFO_FILENAME);
            $array = @include $file;
            if (! is_array($array)) {
                continue;
            }

            foreach ($this->flattenLangArray($array, $group.'.') as $key => $value) {
                if (! is_string($value) || $value === '') {
                    continue;
                }
                if (! $this->isFrameworkKeyAllowed($key)) {
                    continue;
                }
                if (in_array(TranslationKey::deriveGroup($key), $this->excludedGroups, true)) {
                    continue;
                }
                if (isset($found[$key]) && !empty($found[$key]['source'])) {
                    continue;
                }

                $found[$key] = ['key' => $key, 'source' => $this->normaliseFrameworkSource($value)];
                $added++;
            }
        }

        return $added;
    }

    /**
     * Whether a key flattened out of lang/en/*.php should be
     * imported into the DB-backed dictionary.
     */
    private function isFrameworkKeyAllowed(string $key): bool
    {
        $group = TranslationKey::deriveGroup($key);

        if (in_array($group, $this->frameworkLangAllowedGroups, true)) {
            return true;
        }

        return in_array($key, $this->frameworkLangAllowedKeys, true);
    }

    /**
     * Convert Laravel's colon-prefixed placeholders to the app's
     * curly-brace convention, e.g.
     *   "The :attribute field is required."
     *     → "The {attribute} field is required."
     *
     * Only word-character tokens are rewritten so things like
     * "Visit https://example.com" survive untouched.
     */
    private function normaliseFrameworkSource(string $value): string
    {
        return preg_replace('/:([a-zA-Z_][\w]*)/', '{$1}', $value) ?? $value;
    }

    /**
     * Drop previously-synced framework rows that no longer match
     * the allowlist (e.g. when validation.alpha_dash was imported
     * by an earlier run and has since been removed from the list).
     * Only touches rows we own (is_auto_synced=true) and never
     * touches user-added or t()-call keys.
     *
     * @return int  Number of rows deleted.
     */
    private function pruneStaleFrameworkKeys(): int
    {
        $groups = ['auth', 'passwords', 'pagination', 'validation'];

        return TranslationKey::query()
            ->whereIn('group', $groups)
            ->where('is_auto_synced', true)
            ->where(function ($q) {
                $q->whereNotIn('group', $this->frameworkLangAllowedGroups);
                if (!empty($this->frameworkLangAllowedKeys)) {
                    $q->whereNotIn('key', $this->frameworkLangAllowedKeys);
                }
            })
            ->delete();
    }

    /**
     * Convert any lingering `:placeholder` tokens in saved
     * translation values for framework keys to the `{placeholder}`
     * convention used by the source after normalisation. Touches
     * only framework groups so legitimate `:` usage in app-managed
     * translations (e.g. "Note: this is required") is left alone.
     *
     * @return int  Number of translation rows rewritten.
     */
    private function normaliseFrameworkTranslationValues(): int
    {
        $frameworkKeyIds = TranslationKey::query()
            ->whereIn('group', ['auth', 'passwords', 'pagination', 'validation'])
            ->pluck('id');

        if ($frameworkKeyIds->isEmpty()) {
            return 0;
        }

        $updated = 0;
        Translation::query()
            ->whereIn('translation_key_id', $frameworkKeyIds)
            ->whereNotNull('value')
            ->where('value', '!=', '')
            ->where('value', 'like', '%:%')
            ->chunkById(500, function ($rows) use (&$updated) {
                foreach ($rows as $row) {
                    $normalised = preg_replace(
                        '/:([a-zA-Z_][\w]*)/',
                        '{$1}',
                        $row->value,
                    );
                    if ($normalised !== null && $normalised !== $row->value) {
                        $row->update(['value' => $normalised]);
                        $updated++;
                    }
                }
            });

        return $updated;
    }

    /**
     * Recursively flatten a nested lang array into dotted keys.
     * Used for entries like `validation.between.string`.
     *
     * @param  array<mixed>  $array
     * @return Generator<string, mixed>
     */
    private function flattenLangArray(array $array, string $prefix): Generator
    {
        foreach ($array as $k => $v) {
            $key = $prefix.$k;
            if (is_array($v)) {
                yield from $this->flattenLangArray($v, $key.'.');
            } else {
                yield $key => $v;
            }
        }
    }
}

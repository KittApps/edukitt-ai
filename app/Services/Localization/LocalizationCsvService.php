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

namespace App\Services\Localization;

use App\Models\Language;
use App\Models\Translation;
use App\Models\TranslationKey;
use App\Services\LocalizationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Export / import translations and language metadata to a single CSV
 * with two named sections (LANGUAGES, TRANSLATIONS) separated by a
 * blank row.
 *
 * Format:
 *
 *   LANGUAGES
 *   code,name,native_name,flag,direction,is_default,is_active
 *   (column is_default is legacy; the translation base is always English after import.)
 *   en,English,English,🇬🇧,ltr,true,true
 *   …
 *   <blank>
 *   TRANSLATIONS
 *   group,key,source,placeholders,en,si,ta
 *   subscription,subscription.plan.free,Free,,Free,නොමිලේ,இலவசம்
 *   …
 *
 * Import is column-driven: only language columns present in the
 * TRANSLATIONS header are touched; missing language columns are
 * left untouched in the database. Empty cells are skipped unless
 * the caller opts into "overwrite empty" mode.
 */
class LocalizationCsvService
{
    private const SECTION_LANGUAGES = 'LANGUAGES';

    private const SECTION_TRANSLATIONS = 'TRANSLATIONS';

    private const TRANSLATION_FIXED_COLUMNS = ['group', 'key', 'source', 'placeholders'];

    private const LANGUAGE_COLUMNS = [
        'code',
        'name',
        'native_name',
        'flag',
        'direction',
        'is_default',
        'is_active',
    ];

    public function __construct(private readonly LocalizationService $service) {}

    /**
     * Build the CSV body. When `$languageCode` is null every active
     * language is included; otherwise only that language gets a
     * column in the TRANSLATIONS section.
     */
    public function export(?string $languageCode = null): string
    {
        $languages = $languageCode === null
            ? Language::query()->orderByDesc('is_default')->orderBy('name')->get()
            : Language::query()->where('code', $languageCode)->get();

        if ($languages->isEmpty()) {
            throw new \RuntimeException("Unknown language: {$languageCode}");
        }

        $codes = $languages->pluck('code')->all();

        $valuesByLang = $this->loadValuesByLanguage($codes);
        $keys = TranslationKey::query()->orderBy('group')->orderBy('key')->get();

        $handle = fopen('php://temp', 'w+');

        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, [self::SECTION_LANGUAGES]);
        fputcsv($handle, self::LANGUAGE_COLUMNS);
        foreach ($languages as $lang) {
            fputcsv($handle, [
                $lang->code,
                $lang->name,
                $lang->native_name,
                $lang->flag ?? '',
                $lang->direction,
                $lang->is_default ? 'true' : 'false',
                $lang->is_active ? 'true' : 'false',
            ]);
        }

        fputcsv($handle, []);

        fputcsv($handle, [self::SECTION_TRANSLATIONS]);
        fputcsv($handle, array_merge(self::TRANSLATION_FIXED_COLUMNS, $codes));

        $defaultCode = Language::query()->where('is_default', true)->value('code');

        foreach ($keys as $key) {
            $row = [
                $key->group,
                $key->key,
                (string) $key->source,
                implode(',', is_array($key->placeholders) ? $key->placeholders : []),
            ];

            foreach ($codes as $code) {
                if ($code === $defaultCode) {
                    $row[] = (string) $key->source;
                    continue;
                }
                $row[] = $valuesByLang[$code][$key->key] ?? '';
            }

            fputcsv($handle, $row);
        }

        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);

        return (string) $contents;
    }

    /**
     * Parse and apply the CSV. Returns a structured result so the
     * caller can surface per-row errors back to the operator.
     *
     * The LANGUAGES section is applied implicitly whenever it's
     * present — that way a TRANSLATIONS column referencing a
     * not-yet-installed language code is auto-provisioned from the
     * file rather than rejected.
     *
     * @param  array{overwrite_empty?: bool}  $options
     */
    public function import(string $contents, array $options = []): LocalizationImportResult
    {
        $result = new LocalizationImportResult();

        $overwriteEmpty = (bool) ($options['overwrite_empty'] ?? false);

        $rows = $this->parseCsv($contents);
        if ($rows === []) {
            $result->errors[] = ['row' => 0, 'message' => 'The file is empty or could not be parsed as CSV.'];

            return $result;
        }

        $sections = $this->splitSections($rows);

        if ($sections['languages'] !== null) {
            $this->applyLanguagesSection($sections['languages']['header'], $sections['languages']['rows'], $result);
        }

        if ($sections['translations'] === null) {
            if ($sections['languages'] === null) {
                $result->errors[] = [
                    'row' => 0,
                    'message' => 'No TRANSLATIONS section found.',
                ];
            }

            $this->service->forgetCache();

            return $result;
        }

        $this->applyTranslationsSection(
            $sections['translations']['header'],
            $sections['translations']['rows'],
            $overwriteEmpty,
            $result,
        );

        $this->service->forgetCache();

        return $result;
    }

    /**
     * @param  array<int, string>  $codes
     * @return array<string, array<string, string>>
     */
    private function loadValuesByLanguage(array $codes): array
    {
        if ($codes === []) {
            return [];
        }

        $rows = Translation::query()
            ->join('languages', 'languages.id', '=', 'translations.language_id')
            ->join('translation_keys', 'translation_keys.id', '=', 'translations.translation_key_id')
            ->whereIn('languages.code', $codes)
            ->select([
                'languages.code as lang_code',
                'translation_keys.key as key',
                'translations.value as value',
            ])
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[$row->lang_code][$row->key] = (string) ($row->value ?? '');
        }

        return $out;
    }

    /**
     * Strip BOM, normalise line endings and parse the file into raw
     * rows. Each row keeps its original 1-indexed line number so we
     * can surface row-level errors back to the operator.
     *
     * @return array<int, array{line: int, cells: array<int, string>}>
     */
    private function parseCsv(string $contents): array
    {
        if (str_starts_with($contents, "\xEF\xBB\xBF")) {
            $contents = substr($contents, 3);
        }

        $handle = fopen('php://memory', 'r+');
        fwrite($handle, $contents);
        rewind($handle);

        $rows = [];
        $line = 0;
        while (($cells = fgetcsv($handle)) !== false) {
            $line++;
            if ($cells === [null] || $cells === false) {
                continue;
            }
            $rows[] = ['line' => $line, 'cells' => array_map(fn ($c) => (string) ($c ?? ''), $cells)];
        }
        fclose($handle);

        return $rows;
    }

    /**
     * Locate the two named sections in the parsed rows. Either
     * section is optional; section order is irrelevant.
     *
     * @param  array<int, array{line: int, cells: array<int, string>}>  $rows
     * @return array{
     *     languages: null|array{header: array<int, string>, rows: array<int, array{line: int, cells: array<int, string>}>},
     *     translations: null|array{header: array<int, string>, rows: array<int, array{line: int, cells: array<int, string>}>},
     * }
     */
    private function splitSections(array $rows): array
    {
        $sections = ['languages' => null, 'translations' => null];

        $current = null;
        $header = null;
        $buffer = [];

        $flush = function () use (&$sections, &$current, &$header, &$buffer) {
            if ($current !== null && $header !== null) {
                $sections[$current] = ['header' => $header, 'rows' => $buffer];
            }
            $current = null;
            $header = null;
            $buffer = [];
        };

        foreach ($rows as $row) {
            $first = trim($row['cells'][0] ?? '');
            $isBlank = $first === '' && count(array_filter($row['cells'], fn ($c) => trim($c) !== '')) === 0;

            if ($first === self::SECTION_LANGUAGES) {
                $flush();
                $current = 'languages';
                $header = null;
                continue;
            }
            if ($first === self::SECTION_TRANSLATIONS) {
                $flush();
                $current = 'translations';
                $header = null;
                continue;
            }
            if ($current === null) {
                continue;
            }
            if ($isBlank) {
                $flush();
                continue;
            }
            if ($header === null) {
                $header = array_map(fn ($c) => trim($c), $row['cells']);
                continue;
            }
            $buffer[] = $row;
        }
        $flush();

        return $sections;
    }

    /**
     * @param  array<int, string>  $header
     * @param  array<int, array{line: int, cells: array<int, string>}>  $rows
     */
    private function applyLanguagesSection(array $header, array $rows, LocalizationImportResult $result): void
    {
        $index = array_flip($header);

        foreach (['code', 'name', 'native_name', 'direction'] as $required) {
            if (! array_key_exists($required, $index)) {
                $result->errors[] = [
                    'row' => 0,
                    'message' => "LANGUAGES section is missing required column: {$required}.",
                ];

                return;
            }
        }

        foreach ($rows as $row) {
            $line = $row['line'];
            $cells = $row['cells'];

            $code = trim($cells[$index['code']] ?? '');
            $name = trim($cells[$index['name']] ?? '');
            $native = trim($cells[$index['native_name']] ?? '');
            $direction = strtolower(trim($cells[$index['direction']] ?? ''));

            if ($code === '' || $name === '' || $native === '') {
                $result->errors[] = ['row' => $line, 'message' => 'Language row is missing code, name or native_name.'];
                $result->rowsSkipped++;
                continue;
            }
            if (! in_array($direction, ['ltr', 'rtl'], true)) {
                $result->errors[] = ['row' => $line, 'message' => "Invalid direction '{$direction}' (expected 'ltr' or 'rtl')."];
                $result->rowsSkipped++;
                continue;
            }

            $payload = [
                'name' => $name,
                'native_name' => $native,
                'flag' => isset($index['flag']) ? (trim($cells[$index['flag']] ?? '') ?: null) : null,
                'direction' => $direction,
                'is_active' => isset($index['is_active'])
                    ? $this->parseBool($cells[$index['is_active']] ?? '', true)
                    : true,
            ];

            try {
                $existing = Language::query()->where('code', $code)->first();

                if ($existing === null) {
                    // Translation base (`is_default`) is fixed separately — CSV cannot relocate it.
                    $payload['is_default'] = false;
                    Language::query()->create(['code' => $code] + $payload);
                    $result->languagesCreated++;
                    continue;
                }

                $existing->fill($payload)->save();
                $result->languagesUpdated++;
            } catch (Throwable $e) {
                $result->errors[] = ['row' => $line, 'message' => "Failed to save language '{$code}': {$e->getMessage()}"];
                $result->rowsSkipped++;
            }
        }

        $this->enforceEnglishTranslationSource();
    }

    /**
     * Keeps exactly one translation-source row (`is_default`): English when present.
     */
    private function enforceEnglishTranslationSource(): void
    {
        if (! Schema::hasTable('languages')) {
            return;
        }

        $enId = Language::query()->where('code', 'en')->value('id');

        Language::query()->update(['is_default' => false]);

        if ($enId !== null) {
            Language::query()->where('id', $enId)->update([
                'is_default' => true,
                'is_active' => true,
            ]);
        } else {
            Language::query()->orderBy('id')->limit(1)->update(['is_default' => true]);
        }

        try {
            $this->service->forgetCache();
        } catch (Throwable) {
            //
        }
    }

    /**
     * @param  array<int, string>  $header
     * @param  array<int, array{line: int, cells: array<int, string>}>  $rows
     */
    private function applyTranslationsSection(
        array $header,
        array $rows,
        bool $overwriteEmpty,
        LocalizationImportResult $result,
    ): void {
        $normalized = array_map(fn ($c) => trim($c), $header);
        $index = array_flip($normalized);

        foreach (self::TRANSLATION_FIXED_COLUMNS as $required) {
            if (! array_key_exists($required, $index)) {
                $result->errors[] = [
                    'row' => 0,
                    'message' => "TRANSLATIONS section is missing required column: {$required}.",
                ];

                return;
            }
        }

        $langCodes = array_values(array_filter(
            $normalized,
            fn ($c) => ! in_array($c, self::TRANSLATION_FIXED_COLUMNS, true) && $c !== '',
        ));

        if ($langCodes === []) {
            $result->errors[] = [
                'row' => 0,
                'message' => 'TRANSLATIONS section has no language columns.',
            ];

            return;
        }

        $languages = Language::query()->whereIn('code', $langCodes)->get()->keyBy('code');
        $missing = array_diff($langCodes, $languages->keys()->all());
        if ($missing !== []) {
            $result->errors[] = [
                'row' => 0,
                'message' => 'Unknown language column(s): '.implode(', ', $missing)
                    .'. Add them via the Languages tab or include them in the LANGUAGES section.',
            ];

            return;
        }

        $defaultLanguage = $languages->first(fn (Language $l) => $l->is_default);

        $keysByName = TranslationKey::query()->get()->keyBy('key');

        foreach ($rows as $row) {
            $line = $row['line'];
            $cells = $row['cells'];

            $key = trim($cells[$index['key']] ?? '');
            $source = $cells[$index['source']] ?? '';
            $group = trim($cells[$index['group']] ?? '');

            if ($key === '') {
                $result->errors[] = ['row' => $line, 'message' => 'Missing key.'];
                $result->rowsSkipped++;
                continue;
            }
            if (! preg_match('/^[\w]+(?:\.[\w]+)*$/', $key)) {
                $result->errors[] = ['row' => $line, 'message' => "Invalid key format: '{$key}'."];
                $result->rowsSkipped++;
                continue;
            }

            try {
                $translationKey = $keysByName->get($key);
                if ($translationKey === null) {
                    $translationKey = TranslationKey::create([
                        'group' => $group !== '' ? $group : TranslationKey::deriveGroup($key),
                        'key' => $key,
                        'source' => (string) $source,
                        'placeholders' => TranslationKey::extractPlaceholders((string) $source),
                        'is_auto_synced' => false,
                    ]);
                    $keysByName->put($key, $translationKey);
                    $result->keysCreated++;
                }

                foreach ($langCodes as $code) {
                    $colIndex = $index[$code] ?? null;
                    if ($colIndex === null) {
                        continue;
                    }
                    $value = $cells[$colIndex] ?? '';

                    if ($value === '' && ! $overwriteEmpty) {
                        continue;
                    }

                    $language = $languages[$code];

                    if ($language->is_default || ($defaultLanguage !== null && $language->code === $defaultLanguage->code)) {
                        $translationKey->update(['source' => $value]);
                        $result->sourcesUpdated++;
                        continue;
                    }

                    Translation::updateOrCreate(
                        [
                            'language_id' => $language->id,
                            'translation_key_id' => $translationKey->id,
                        ],
                        ['value' => $value],
                    );
                    $result->translationsUpdated++;
                }
            } catch (Throwable $e) {
                $result->errors[] = [
                    'row' => $line,
                    'message' => "Failed to save key '{$key}': {$e->getMessage()}",
                ];
                $result->rowsSkipped++;
            }
        }
    }

    private function parseBool(string $raw, bool $default): bool
    {
        $v = strtolower(trim($raw));
        if (in_array($v, ['1', 'true', 'yes', 'y'], true)) {
            return true;
        }
        if (in_array($v, ['0', 'false', 'no', 'n'], true)) {
            return false;
        }

        return $default;
    }

    /**
     * @return Collection<int, array{code: string, name: string}>
     */
    public function availableLanguageOptions(): Collection
    {
        return Language::query()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get(['code', 'name'])
            ->map(fn (Language $l) => ['code' => $l->code, 'name' => $l->name]);
    }
}

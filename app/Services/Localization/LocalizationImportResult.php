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

class LocalizationImportResult
{
    /** @var array<int, array{row: int, message: string}> */
    public array $errors = [];

    public int $languagesCreated = 0;

    public int $languagesUpdated = 0;

    public int $keysCreated = 0;

    public int $sourcesUpdated = 0;

    public int $translationsUpdated = 0;

    public int $rowsSkipped = 0;

    public function hasErrors(): bool
    {
        return $this->errors !== [];
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'errors' => $this->errors,
            'languages_created' => $this->languagesCreated,
            'languages_updated' => $this->languagesUpdated,
            'keys_created' => $this->keysCreated,
            'sources_updated' => $this->sourcesUpdated,
            'translations_updated' => $this->translationsUpdated,
            'rows_skipped' => $this->rowsSkipped,
        ];
    }

    public function summary(): string
    {
        $parts = [];
        if ($this->languagesCreated > 0) {
            $parts[] = "{$this->languagesCreated} language(s) added";
        }
        if ($this->languagesUpdated > 0) {
            $parts[] = "{$this->languagesUpdated} language(s) updated";
        }
        if ($this->keysCreated > 0) {
            $parts[] = "{$this->keysCreated} new key(s) created";
        }
        if ($this->translationsUpdated > 0 || $this->sourcesUpdated > 0) {
            $total = $this->translationsUpdated + $this->sourcesUpdated;
            $parts[] = "{$total} translation(s) updated";
        }
        if ($this->rowsSkipped > 0) {
            $parts[] = "{$this->rowsSkipped} row(s) skipped";
        }

        return $parts === []
            ? 'No changes applied.'
            : 'Import complete · '.implode(' · ', $parts);
    }
}

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

use App\Services\LocalizationService;
use Closure;
use Illuminate\Translation\Translator;
use Throwable;

/**
 * Bridges Laravel's built-in translator with the app's DB-backed
 * dictionary (translation_keys + translations).
 *
 * Why: framework messages — auth.failed, validation.required,
 * passwords.sent, etc. — go through trans()/__(), not through our
 * t() helper. Without this bridge they always stay English and
 * can't be edited from /admin/settings/localization.
 *
 * Storage convention: the DB always uses `{placeholder}` style.
 * Framework keys imported from lang/en/*.php are normalised at
 * import time ({@see \App\Console\Commands\SyncLocaleCommand}).
 * That keeps the placeholder chips, the missing-placeholder
 * validator, and the AI auto-translator on a single uniform format.
 *
 * Lookup order for every call:
 *   1. The DB dictionary for the requested locale (our values).
 *   2. Parent translator (vendor lang/en/*.php files) as a fallback
 *      for keys we haven't whitelisted.
 *
 * Placeholder substitution is performed in three passes when the
 * value comes from the DB:
 *   1. `{name}` → value for scalar replacements supplied to us
 *      (our app-wide convention).
 *   2. `parent::makeReplacements()` for any `:name` tokens —
 *      defensive cover for legacy values that pre-date the
 *      curly-brace normalisation, plus closure/object replacements
 *      parent has special handling for.
 *   3. Any leftover `{name}` tokens are rewritten to `:name` so
 *      downstream callers that run their own substitution pass
 *      (most importantly Laravel's Validator, which never forwards
 *      its attribute/parameter replacements through the translator)
 *      see placeholders in the syntax their own logic expects.
 */
class DatabaseTranslator extends Translator
{
    public function get($key, array $replace = [], $locale = null, $fallback = true)
    {
        $value = $this->lookupInDatabase($key, $locale);

        if ($value !== null) {
            $value = $this->replaceCurlyTokens($value, $replace);
            $value = parent::makeReplacements($value, $replace);

            return $this->convertCurlyToColon($value);
        }

        return parent::get($key, $replace, $locale, $fallback);
    }

    /**
     * Read a single key from the DB-backed dictionary. Returns null
     * when the key is unknown / empty so callers can fall through to
     * the file-based translator.
     */
    private function lookupInDatabase(string $key, ?string $locale): ?string
    {
        try {
            /** @var LocalizationService $service */
            $service = app(LocalizationService::class);
            $code = $locale ?: $service->currentCode();
            $dict = $service->dictionaryFor($code);
        } catch (Throwable) {
            return null;
        }

        $value = $dict[$key] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * Substitute {name} tokens with their scalar replacement value.
     * Closures and objects are deferred to {@see parent::makeReplacements()}
     * which has dedicated handling for them.
     *
     * @param  array<string, mixed>  $replace
     */
    private function replaceCurlyTokens(string $line, array $replace): string
    {
        if (empty($replace)) {
            return $line;
        }

        $tokens = [];
        foreach ($replace as $key => $value) {
            if ($value instanceof Closure || is_object($value)) {
                continue;
            }
            $tokens['{'.$key.'}'] = (string) ($value ?? '');
        }

        return $tokens === [] ? $line : strtr($line, $tokens);
    }

    /**
     * Convert leftover `{name}` placeholders to `:name` so callers
     * that run their own substitution pass (Laravel's Validator,
     * password broker, etc.) can match the syntax they natively
     * expect. Safe because all our supplied replacements have
     * already been applied above — anything still in curly-brace
     * form is a downstream concern, not data.
     */
    private function convertCurlyToColon(string $line): string
    {
        return preg_replace('/\{([a-zA-Z_][\w]*)\}/', ':$1', $line) ?? $line;
    }
}

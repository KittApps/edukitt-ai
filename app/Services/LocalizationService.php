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

namespace App\Services;

use App\Models\Language;
use App\Models\Translation;
use App\Models\TranslationKey;
use App\Services\Settings\GeneralSettings;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Throwable;

class LocalizationService
{
    public function __construct(
        private readonly GeneralSettings $generalSettings,
    ) {}

    private const CACHE_PREFIX = 'i18n.dict.';
    private const LOCALES_CACHE = 'i18n.locales';

    /**
     * In-request memo so we don't re-hit the cache store multiple times per request.
     *
     * @var array<string, mixed>
     */
    private array $memo = [];

    /**
     * Flat dictionary [key => value] for a language. Falls back to source
     * text for any key that doesn't have a translation value.
     *
     * @return array<string, string>
     */
    public function dictionaryFor(string $code): array
    {
        return Cache::rememberForever(self::CACHE_PREFIX . $code, function () use ($code) {
            try {
                if (!Schema::hasTable('languages') || !Schema::hasTable('translation_keys')) {
                    return [];
                }
            } catch (Throwable) {
                return [];
            }

            $language = Language::where('code', $code)->first();
            if (!$language) {
                return [];
            }

            /** @var array<string, string> $base */
            $base = TranslationKey::query()->pluck('source', 'key')->all();

            if ($language->is_default) {
                return $base;
            }

            /** @var array<string, string> $overrides */
            $overrides = Translation::query()
                ->where('translations.language_id', $language->id)
                ->whereNotNull('translations.value')
                ->where('translations.value', '!=', '')
                ->join('translation_keys', 'translation_keys.id', '=', 'translations.translation_key_id')
                ->pluck('translations.value', 'translation_keys.key')
                ->all();

            return array_merge($base, $overrides);
        });
    }

    /**
     * Active languages as lightweight arrays — cached.
     * We cache plain arrays (not Eloquent models) so the payload is safe across
     * class reloads / deploys. Rehydrate to models on demand if needed.
     *
     * @return array<int, array{code: string, name: string, native_name: string, flag: ?string, direction: string, is_default: bool, is_active: bool}>
     */
    public function availableLanguages(): array
    {
        if (isset($this->memo[self::LOCALES_CACHE])) {
            return $this->memo[self::LOCALES_CACHE];
        }

        $payload = Cache::rememberForever(self::LOCALES_CACHE, function (): array {
            try {
                if (!Schema::hasTable('languages')) {
                    return [];
                }
            } catch (Throwable) {
                return [];
            }

            return Language::query()
                ->active()
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get()
                ->map(fn (Language $l) => [
                    'code' => $l->code,
                    'name' => $l->name,
                    'native_name' => $l->native_name,
                    'flag' => $l->flag,
                    'direction' => $l->direction,
                    'is_default' => (bool) $l->is_default,
                    'is_active' => (bool) $l->is_active,
                ])
                ->values()
                ->all();
        });

        // Defensive: if the cache returned an unexpected shape (eg. stale
        // __PHP_Incomplete_Class from a previous deploy), fall back to a fresh read.
        if (!is_array($payload)) {
            Cache::forget(self::LOCALES_CACHE);
            $payload = $this->availableLanguages();
        }

        return $this->memo[self::LOCALES_CACHE] = $payload;
    }

    /**
     * Resolve the current locale code.
     *
     * Order of precedence:
     *   1. Per-request session pick (explicit user choice).
     *   2. On queue/CLI runs only: the translator's active locale.
     *      This is what Laravel's NotificationSender::withLocale()
     *      updates when it calls `App::setLocale($notifiable->preferredLocale())`
     *      before invoking toMail() in a queue worker. On HTTP
     *      requests the translator is still at `config('app.locale')`
     *      (e.g. 'en') until the SetLocale middleware runs, so trusting
     *      it there would silently override the admin-flagged default.
     *   3. The default site language configured on General → Site
     *      (`general.site.default_language_code`), when that code is
     *      still active in the languages table.
     *   4. The translation source language row (`languages.is_default`,
     *      expected to be English and not changed from the Localization UI).
     *   5. First active available language.
     *   6. Hard fallback to 'en'.
     */
    public function currentCode(): string
    {
        $code = session('locale');
        if (is_string($code) && $code !== '') {
            return $code;
        }

        $languages = $this->availableLanguages();

        // Queue / CLI: trust the translator's locale because
        // Notification::withLocale() has set it to the recipient's
        // preferred language right before the notification renders.
        if (app()->runningInConsole()) {
            try {
                $translatorLocale = (string) app('translator')->getLocale();
            } catch (Throwable) {
                $translatorLocale = '';
            }

            if ($translatorLocale !== '') {
                foreach ($languages as $lang) {
                    if ($lang['code'] === $translatorLocale) {
                        return $translatorLocale;
                    }
                }
            }
        }

        $visitorDefault = $this->generalSettings->siteDefaultLanguageCode();
        if (is_string($visitorDefault) && $visitorDefault !== '') {
            foreach ($languages as $lang) {
                if ($lang['code'] === $visitorDefault && ($lang['is_active'] ?? false)) {
                    return $visitorDefault;
                }
            }
        }

        foreach ($languages as $lang) {
            if (! empty($lang['is_default'])) {
                return $lang['code'];
            }
        }

        return $languages[0]['code'] ?? 'en';
    }

    public function currentDirection(): string
    {
        $code = $this->currentCode();
        foreach ($this->availableLanguages() as $lang) {
            if ($lang['code'] === $code) {
                return $lang['direction'];
            }
        }
        return 'ltr';
    }

    public function setCurrentCode(string $code): void
    {
        session(['locale' => $code]);
    }

    /**
     * Translate a single key. Falls back to the provided fallback, then the key itself.
     * Replaces {placeholder} tokens.
     *
     * @param  array<string, string|int|float>  $replace
     */
    public function translate(
        string $key,
        ?string $fallback = null,
        array $replace = [],
        ?string $locale = null,
    ): string {
        $code = $locale ?? $this->currentCode();
        $dict = $this->dictionaryFor($code);

        $text = $dict[$key] ?? $fallback ?? $key;

        foreach ($replace as $placeholder => $value) {
            $text = str_replace('{' . $placeholder . '}', (string) $value, $text);
        }

        return $text;
    }

    /**
     * Clear all cached dictionaries + language list. Call after any write.
     */
    public function forgetCache(): void
    {
        try {
            if (Schema::hasTable('languages')) {
                foreach (Language::query()->pluck('code') as $code) {
                    Cache::forget(self::CACHE_PREFIX . $code);
                }
            }
        } catch (Throwable) {
            // ignore
        }

        Cache::forget(self::LOCALES_CACHE);
        $this->memo = [];
    }
}

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

namespace App\Http\Controllers\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Models\AiProvider;
use App\Models\Language;
use App\Models\Translation;
use App\Models\TranslationKey;
use App\Services\Localization\LocalizationAiTranslateService;
use App\Services\Localization\LocalizationCsvService;
use App\Services\LocalizationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LocalizationController extends Controller
{
    public function index()
    {
        $languages = Language::query()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        $keys = TranslationKey::query()
            ->orderBy('group')
            ->orderBy('key')
            ->get(['id', 'group', 'key', 'source', 'placeholders', 'updated_at']);

        $totalKeys = $keys->count();

        $translationRows = Translation::query()
            ->join('languages', 'languages.id', '=', 'translations.language_id')
            ->join('translation_keys', 'translation_keys.id', '=', 'translations.translation_key_id')
            ->select([
                'languages.code as lang_code',
                'translation_keys.key as key',
                'translations.value as value',
                'translations.updated_at as updated_at',
            ])
            ->get();

        /** @var array<string, array<string, array{value: string, updated_at: ?string}>> $values */
        $values = [];
        foreach ($translationRows as $row) {
            $values[$row->lang_code][$row->key] = [
                'value' => $row->value ?? '',
                'updated_at' => $row->updated_at
                    ? Carbon::parse($row->updated_at)->diffForHumans()
                    : null,
            ];
        }

        $languagesPayload = $languages->map(function (Language $lang) use ($values, $totalKeys) {
            $translated = $lang->is_default
                ? $totalKeys
                : count(array_filter(
                    $values[$lang->code] ?? [],
                    fn ($entry) => !empty($entry['value']),
                ));

            return [
                'code' => $lang->code,
                'name' => $lang->name,
                'native_name' => $lang->native_name,
                'flag' => $lang->flag ?? '',
                'direction' => $lang->direction,
                'is_default' => $lang->is_default,
                'is_active' => $lang->is_active,
                'translated_count' => $translated,
                'total_count' => $totalKeys,
            ];
        });

        $keysPayload = $keys->map(fn ($k) => [
            'id' => $k->id,
            'group' => $k->group,
            'key' => $k->key,
            'source' => $k->source,
            'placeholders' => is_array($k->placeholders) ? $k->placeholders : [],
            'updated_at' => $k->updated_at?->diffForHumans(),
        ]);

        return Inertia::render('Admin/Settings/Localization', [
            'languages' => $languagesPayload,
            'keys' => $keysPayload,
            'values' => $values,
            'last_sync_at' => Language::where('is_default', true)
                ->value('last_synced_at')?->diffForHumans(),
        ]);
    }

    public function addLanguage(Request $request, LocalizationService $service)
    {
        $data = $request->validate([
            'code' => 'required|string|max:10',
            'name' => 'required|string|max:255',
            'native_name' => 'required|string|max:255',
            'flag' => 'nullable|string|max:16',
            'direction' => 'required|in:ltr,rtl',
        ]);

        // Silently ignore duplicates.
        Language::firstOrCreate(
            ['code' => $data['code']],
            [
                'name' => $data['name'],
                'native_name' => $data['native_name'],
                'flag' => $data['flag'] ?? null,
                'direction' => $data['direction'],
                'is_default' => false,
                'is_active' => true,
            ],
        );

        $service->forgetCache();

        return redirect()->back();
    }

    public function updateLanguage(Request $request, string $code, LocalizationService $service)
    {
        $language = Language::where('code', $code)->firstOrFail();

        $data = $request->validate([
            'is_active' => 'sometimes|boolean',
            'name' => 'sometimes|string|max:255',
            'native_name' => 'sometimes|string|max:255',
            'flag' => 'sometimes|nullable|string|max:16',
            'direction' => 'sometimes|in:ltr,rtl',
        ]);

        // Visitor default language is edited only via General → Site.
        unset($data['is_default']);

        $language->update($data);
        $service->forgetCache();

        return redirect()->back();
    }

    public function removeLanguage(string $code, LocalizationService $service)
    {
        $language = Language::where('code', $code)->firstOrFail();

        if ($language->is_default) {
            return back()->withErrors(['language' => 'Cannot remove the English translation base language.']);
        }

        $language->delete();
        $service->forgetCache();

        return redirect()->back();
    }

    public function addKey(Request $request, LocalizationService $service)
    {
        $data = $request->validate([
            'key' => 'required|string|max:255|regex:/^[\w]+(?:\.[\w]+)*$/',
            'source' => 'required|string',
        ]);

        // Silently ignore duplicates (same key).
        TranslationKey::firstOrCreate(
            ['key' => $data['key']],
            [
                'group' => TranslationKey::deriveGroup($data['key']),
                'source' => $data['source'],
                'placeholders' => TranslationKey::extractPlaceholders($data['source']),
                'is_auto_synced' => false,
            ],
        );

        $service->forgetCache();

        return redirect()->back();
    }

    public function removeKey(int $id, LocalizationService $service)
    {
        TranslationKey::where('id', $id)->delete();
        $service->forgetCache();

        return redirect()->back();
    }

    public function saveTranslation(Request $request, LocalizationService $service)
    {
        $data = $request->validate([
            'language_code' => 'required|string|exists:languages,code',
            'key' => 'required|string|exists:translation_keys,key',
            'value' => 'nullable|string',
        ]);

        $language = Language::where('code', $data['language_code'])->firstOrFail();
        $key = TranslationKey::where('key', $data['key'])->firstOrFail();

        // The default language's source is managed from code, not per-row translations.
        if ($language->is_default) {
            $key->update(['source' => $data['value'] ?? $key->source]);
        } else {
            Translation::updateOrCreate(
                ['language_id' => $language->id, 'translation_key_id' => $key->id],
                ['value' => $data['value'] ?? ''],
            );
        }

        $service->forgetCache();

        return response()->json(['ok' => true]);
    }

    public function exportCsv(Request $request, LocalizationCsvService $csv): StreamedResponse
    {
        $data = $request->validate([
            'language' => 'nullable|string|exists:languages,code',
        ]);

        $code = $data['language'] ?? null;
        $contents = $csv->export($code);

        $filename = $code === null
            ? 'translations-'.now()->format('Y-m-d').'.csv'
            : "translations-{$code}-".now()->format('Y-m-d').'.csv';

        return response()->streamDownload(
            fn () => print $contents,
            $filename,
            [
                'Content-Type' => 'text/csv; charset=utf-8',
                'Cache-Control' => 'no-store, no-cache',
            ],
        );
    }

    public function importCsv(Request $request, LocalizationCsvService $csv)
    {
        $data = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'overwrite_empty' => 'sometimes|boolean',
        ]);

        $contents = file_get_contents($data['file']->getRealPath());
        if ($contents === false) {
            return back()->with('error', 'Could not read the uploaded file.');
        }

        $result = $csv->import($contents, [
            'overwrite_empty' => (bool) ($data['overwrite_empty'] ?? false),
        ]);

        return back()->with('locale_import', $result->toArray() + ['summary' => $result->summary()]);
    }

    /**
     * Lookup payload for the "Auto translate with AI" modal: target
     * languages (default excluded), available groups, and the list
     * of active providers + their active models so the modal can
     * render the provider / model selectors.
     */
    public function aiTranslateOptions(LocalizationAiTranslateService $service): JsonResponse
    {
        $providers = AiProvider::active()
            ->with(['models' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get()
            ->map(fn (AiProvider $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'models' => $p->models->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'model_id' => $m->model_id,
                ])->values()->all(),
            ])
            ->values();

        return response()->json([
            'languages' => $service->targetLanguageOptions(),
            'groups' => $service->groupOptions(),
            'providers' => $providers,
        ]);
    }

    /**
     * Translate the next batch of keys with the AI provider/model the
     * operator picked in the modal. Returns per-batch numbers so the
     * frontend can update its progress bar and decide whether to call
     * again. Stateless server-side: the frontend keeps the running
     * total and stops when `done` is true.
     */
    public function aiTranslateBatch(Request $request, LocalizationAiTranslateService $service): JsonResponse
    {
        $data = $request->validate([
            'language_code' => 'required|string|exists:languages,code',
            'scope' => 'required|in:missing,all',
            'group' => 'nullable|string',
            'ai_provider_id' => 'required|integer|exists:ai_providers,id',
            'ai_provider_model_id' => 'required|integer|exists:ai_provider_models,id',
        ]);

        try {
            $result = $service->translateNextBatch($data);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($result->toArray());
    }
}

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

use App\Ai\Agents\TranslationAgent;
use App\Models\AiProvider;
use App\Models\AiProviderModel;
use App\Models\Language;
use App\Models\Translation;
use App\Models\TranslationKey;
use App\Services\Ai\AdminAi\AdminAiInvoker;
use App\Services\LocalizationService;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;
use Laravel\Ai\Responses\AgentResponse;
use Throwable;

/**
 * Orchestrates a single batch of the admin "Auto translate with AI"
 * action.
 *
 * Stateless on the server: the frontend drives the loop by calling
 * {@see translateNextBatch()} repeatedly until `done` is true. This
 * lets the modal show real progress (`processed / total · %`) without
 * any session / job state to manage.
 */
class LocalizationAiTranslateService
{
    public const SCOPE_MISSING = 'missing';

    public const SCOPE_ALL = 'all';

    public function __construct(
        private readonly AdminAiInvoker $invoker,
        private readonly LocalizationService $cache,
    ) {}

    /**
     * @param  array{
     *     language_code: string,
     *     scope: string,
     *     group: ?string,
     *     ai_provider_id: int,
     *     ai_provider_model_id: int,
     * }  $params
     */
    public function translateNextBatch(array $params): LocalizationAiBatchResult
    {
        $result = new LocalizationAiBatchResult();

        $language = $this->resolveTargetLanguage($params['language_code']);
        [$providerSlug, $modelId] = $this->resolveProviderAndModel(
            (int) $params['ai_provider_id'],
            (int) $params['ai_provider_model_id'],
        );

        $scope = $params['scope'] === self::SCOPE_ALL ? self::SCOPE_ALL : self::SCOPE_MISSING;
        $group = ! empty($params['group']) ? (string) $params['group'] : null;

        $result->remainingBefore = $this->countRemaining($language, $scope, $group);

        if ($result->remainingBefore === 0) {
            $result->done = true;
            $result->remainingAfter = 0;

            return $result;
        }

        $batch = $this->loadNextBatch($language, $scope, $group, TranslationAgent::BATCH_SIZE);

        if ($batch->isEmpty()) {
            $result->done = true;
            $result->remainingAfter = $result->remainingBefore;

            return $result;
        }

        $defaultLang = Language::getDefault();
        $sourceLanguage = $defaultLang?->name ?? 'English';
        $targetLanguage = $this->describeLanguage($language);

        $agent = new TranslationAgent(
            sourceLanguage: $sourceLanguage,
            targetLanguage: $targetLanguage,
            keys: $batch->map(fn (TranslationKey $k) => [
                'key' => $k->key,
                'source' => (string) $k->source,
                'placeholders' => is_array($k->placeholders) ? $k->placeholders : [],
            ])->all(),
        );

        try {
            /** @var AgentResponse $response */
            $response = $this->invoker->invoke(
                agent: $agent,
                prompt: $agent->userPrompt(),
                providerSlug: $providerSlug,
                modelId: $modelId,
            );
        } catch (Throwable $e) {
            // Whole-batch failure: mark every key in the batch as
            // skipped + error so the operator can retry just those.
            foreach ($batch as $key) {
                $result->errors[] = [
                    'key' => $key->key,
                    'message' => 'AI request failed: '.$this->shortMessage($e->getMessage()),
                ];
            }
            $result->skipped = $batch->count();
            $result->remainingAfter = $result->remainingBefore;
            $result->done = false;

            return $result;
        }

        $payload = $this->extractKeys($response);
        $translatedByKey = [];
        foreach ($payload as $entry) {
            $k = $entry['key'] ?? null;
            $v = $entry['translated'] ?? null;
            if (is_string($k) && is_string($v)) {
                $translatedByKey[$k] = $v;
            }
        }

        $batchKeys = $batch->keyBy('id');
        foreach ($batchKeys as $key) {
            if (! array_key_exists($key->key, $translatedByKey)) {
                $result->errors[] = [
                    'key' => $key->key,
                    'message' => 'Missing from AI response.',
                ];
                $result->skipped++;
                continue;
            }

            $value = $translatedByKey[$key->key];

            try {
                Translation::updateOrCreate(
                    [
                        'language_id' => $language->id,
                        'translation_key_id' => $key->id,
                    ],
                    ['value' => $value],
                );
                $result->translated++;
            } catch (Throwable $e) {
                $result->errors[] = [
                    'key' => $key->key,
                    'message' => 'Save failed: '.$this->shortMessage($e->getMessage()),
                ];
                $result->skipped++;
            }
        }

        $this->cache->forgetCache();

        $result->remainingAfter = $this->countRemaining($language, $scope, $group);
        $result->done = $result->remainingAfter === 0 || $result->translated === 0;

        return $result;
    }

    /** @return array<int, array{code: string, name: string}> */
    public function targetLanguageOptions(): array
    {
        return Language::query()
            ->where('is_default', false)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['code', 'name', 'native_name', 'flag'])
            ->map(fn (Language $l) => [
                'code' => $l->code,
                'name' => $l->name,
                'native_name' => $l->native_name,
                'flag' => $l->flag,
            ])
            ->all();
    }

    /** @return array<int, string> */
    public function groupOptions(): array
    {
        return TranslationKey::query()
            ->select('group')
            ->distinct()
            ->orderBy('group')
            ->pluck('group')
            ->all();
    }

    private function resolveTargetLanguage(string $code): Language
    {
        $language = Language::query()->where('code', $code)->first();

        if ($language === null) {
            throw new InvalidArgumentException("Unknown language: {$code}");
        }
        if ($language->is_default) {
            throw new InvalidArgumentException('Cannot auto-translate the default language.');
        }

        return $language;
    }

    /** @return array{0: string, 1: string} provider slug + model id */
    private function resolveProviderAndModel(int $providerId, int $modelId): array
    {
        $provider = AiProvider::query()->where('is_active', true)->find($providerId);
        if ($provider === null) {
            throw new InvalidArgumentException('Selected AI provider is not active.');
        }

        $model = AiProviderModel::query()
            ->where('is_active', true)
            ->where('ai_provider_id', $providerId)
            ->find($modelId);
        if ($model === null) {
            throw new InvalidArgumentException('Selected AI model is not active.');
        }

        return [$provider->slug, $model->model_id];
    }

    private function describeLanguage(Language $language): string
    {
        if ($language->native_name && $language->native_name !== $language->name) {
            return "{$language->name} ({$language->native_name})";
        }

        return $language->name;
    }

    private function countRemaining(Language $language, string $scope, ?string $group): int
    {
        return $this->baseKeyQuery($language, $scope, $group)->count();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, TranslationKey>
     */
    private function loadNextBatch(Language $language, string $scope, ?string $group, int $limit)
    {
        return $this->baseKeyQuery($language, $scope, $group)
            ->orderBy('translation_keys.id')
            ->limit($limit)
            ->get(['translation_keys.id', 'translation_keys.key', 'translation_keys.source', 'translation_keys.placeholders']);
    }

    /**
     * Build the base query of "keys that still need translating into
     * $language under $scope". Used by both the count and the fetch
     * so the two stay in sync.
     */
    private function baseKeyQuery(Language $language, string $scope, ?string $group): Builder
    {
        $query = TranslationKey::query()
            ->whereNotNull('translation_keys.source')
            ->where('translation_keys.source', '!=', '');

        if ($group !== null && $group !== '') {
            $query->where('translation_keys.group', $group);
        }

        if ($scope === self::SCOPE_MISSING) {
            $query->whereNotExists(function ($sub) use ($language) {
                $sub->selectRaw('1')
                    ->from('translations')
                    ->whereColumn('translations.translation_key_id', 'translation_keys.id')
                    ->where('translations.language_id', $language->id)
                    ->where('translations.value', '!=', '');
            });
        }

        return $query;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function extractKeys(AgentResponse $response): array
    {
        // Structured agents return StructuredAgentResponse, which
        // implements ArrayAccess on the parsed payload — same access
        // pattern used by QuizGenerationService et al.
        if ($response instanceof \ArrayAccess && isset($response['keys']) && is_array($response['keys'])) {
            return $response['keys'];
        }

        $raw = (string) ($response->text ?? '');
        $decoded = json_decode($raw, true);
        if (is_array($decoded) && isset($decoded['keys']) && is_array($decoded['keys'])) {
            return $decoded['keys'];
        }

        return [];
    }

    private function shortMessage(string $message): string
    {
        $message = trim($message);

        return mb_strlen($message) > 160
            ? mb_substr($message, 0, 157).'…'
            : $message;
    }
}

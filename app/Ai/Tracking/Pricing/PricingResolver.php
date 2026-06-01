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

namespace App\Ai\Tracking\Pricing;

use App\Models\AiProvider;
use App\Models\AiProviderModel;

/**
 * Resolves the (provider, model) → ModelRates lookup used when recording
 * token usage. Rates come from admin/settings/ai-providers.
 *
 * Hot path: this is called on every LLM completion. Results are memoised
 * in-process so a request that triggers many AI calls only hits the DB once
 * per provider/model combination.
 */
class PricingResolver
{
    /** @var array<string, ModelRates> */
    private array $cache = [];

    public function resolve(?string $providerSlug, ?string $modelId): ModelRates
    {
        if ($providerSlug === null || $modelId === null || $providerSlug === '' || $modelId === '') {
            return ModelRates::unknown();
        }

        $key = $providerSlug.'|'.$modelId;
        if (isset($this->cache[$key])) {
            return $this->cache[$key];
        }

        $provider = AiProvider::query()->where('slug', $providerSlug)->first();
        if (! $provider) {
            return $this->cache[$key] = ModelRates::unknown();
        }

        $model = AiProviderModel::query()
            ->where('ai_provider_id', $provider->id)
            ->where('model_id', $modelId)
            ->first();

        if (! $model) {
            return $this->cache[$key] = new ModelRates($provider->id, null, null, null);
        }

        return $this->cache[$key] = new ModelRates(
            providerId: $provider->id,
            modelId: $model->id,
            inputPerMillion: $model->input_price_per_million !== null
                ? (float) $model->input_price_per_million
                : null,
            outputPerMillion: $model->output_price_per_million !== null
                ? (float) $model->output_price_per_million
                : null,
        );
    }

    /**
     * Drop the in-process cache. Useful for tests and long-running workers
     * that want to pick up admin pricing edits.
     */
    public function flush(): void
    {
        $this->cache = [];
    }
}

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

namespace App\Ai\Tracking;

use App\Ai\Tracking\Pricing\ModelRates;
use Laravel\Ai\Responses\Data\Usage;

/**
 * Write-side DTO consumed by TokenRecorder. Bundles every piece of
 * data needed to persist one ai_token_usages row, with cost computed
 * on construction so the recorder is a thin persistence layer.
 */
final readonly class TokenUsageData
{
    public function __construct(
        public string $invocationId,
        public string $taskType,
        public ?int $userId,
        public ?string $providerSlug,
        public ?string $modelId,
        public ?int $aiProviderId,
        public ?int $aiProviderModelId,
        public int $promptTokens,
        public int $completionTokens,
        public int $cacheReadInputTokens,
        public int $cacheWriteInputTokens,
        public int $reasoningTokens,
        public ?float $inputRate,
        public ?float $outputRate,
        public float $inputCost,
        public float $outputCost,
        public float $totalCost,
    ) {}

    /**
     * Build a TokenUsageData from the Usage object emitted by laravel/ai
     * plus the resolved pricing rates and request context.
     */
    public static function build(
        string $invocationId,
        string $taskType,
        ?int $userId,
        ?string $providerSlug,
        ?string $modelId,
        Usage $usage,
        ModelRates $rates,
    ): self {
        $inputTokens = $usage->promptTokens
            + $usage->cacheReadInputTokens
            + $usage->cacheWriteInputTokens;
        $outputTokens = $usage->completionTokens + $usage->reasoningTokens;

        $costs = $rates->calculate($inputTokens, $outputTokens);

        return new self(
            invocationId: $invocationId,
            taskType: $taskType,
            userId: $userId,
            providerSlug: $providerSlug,
            modelId: $modelId,
            aiProviderId: $rates->providerId,
            aiProviderModelId: $rates->modelId,
            promptTokens: $usage->promptTokens,
            completionTokens: $usage->completionTokens,
            cacheReadInputTokens: $usage->cacheReadInputTokens,
            cacheWriteInputTokens: $usage->cacheWriteInputTokens,
            reasoningTokens: $usage->reasoningTokens,
            inputRate: $rates->inputPerMillion,
            outputRate: $rates->outputPerMillion,
            inputCost: $costs['input_cost'],
            outputCost: $costs['output_cost'],
            totalCost: $costs['total_cost'],
        );
    }

    /** @return array<string, mixed> */
    public function toAttributes(): array
    {
        return [
            'invocation_id' => $this->invocationId,
            'task_type' => $this->taskType,
            'user_id' => $this->userId,
            'provider_slug' => $this->providerSlug,
            'model_id' => $this->modelId,
            'ai_provider_id' => $this->aiProviderId,
            'ai_provider_model_id' => $this->aiProviderModelId,
            'prompt_tokens' => $this->promptTokens,
            'completion_tokens' => $this->completionTokens,
            'cache_read_input_tokens' => $this->cacheReadInputTokens,
            'cache_write_input_tokens' => $this->cacheWriteInputTokens,
            'reasoning_tokens' => $this->reasoningTokens,
            'input_rate' => $this->inputRate,
            'output_rate' => $this->outputRate,
            'input_cost' => $this->inputCost,
            'output_cost' => $this->outputCost,
            'total_cost' => $this->totalCost,
        ];
    }
}

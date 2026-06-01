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

/**
 * Immutable snapshot of the per-model pricing in USD per 1M tokens.
 *
 * Resolved once per (provider, model) pair and stored on every
 * AiTokenUsage row so historical cost data is immune to future rate changes.
 */
final readonly class ModelRates
{
    public function __construct(
        public ?int $providerId,
        public ?int $modelId,
        public ?float $inputPerMillion,
        public ?float $outputPerMillion,
    ) {}

    public static function unknown(): self
    {
        return new self(null, null, null, null);
    }

    public function hasPricing(): bool
    {
        return $this->inputPerMillion !== null || $this->outputPerMillion !== null;
    }

    /**
     * Compute USD cost for the given token counts using these rates.
     *
     * @return array{input_cost: float, output_cost: float, total_cost: float}
     */
    public function calculate(int $inputTokens, int $outputTokens): array
    {
        $inputCost = $this->inputPerMillion !== null
            ? ($inputTokens / 1_000_000) * $this->inputPerMillion
            : 0.0;

        $outputCost = $this->outputPerMillion !== null
            ? ($outputTokens / 1_000_000) * $this->outputPerMillion
            : 0.0;

        return [
            'input_cost' => round($inputCost, 6),
            'output_cost' => round($outputCost, 6),
            'total_cost' => round($inputCost + $outputCost, 6),
        ];
    }
}

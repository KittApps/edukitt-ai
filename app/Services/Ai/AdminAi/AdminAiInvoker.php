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

namespace App\Services\Ai\AdminAi;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Responses\AgentResponse;

/**
 * Minimal AI invoker for admin-panel-only tools.
 *
 * Bypasses the standard {@see \App\Services\Ai\AiService} pipeline:
 *  - no token / cost recording
 *  - no credit pre-check or post-charge
 *  - no access guard / plan gating
 *  - no failure telemetry
 *  - no retry
 *  - no queue
 *
 * Intended for tools where the operator already picks the provider /
 * model in the UI (e.g. localisation auto-translate). Future
 * admin-level AI features (bulk content rewrite, SEO meta generation,
 * support reply suggestions, …) should funnel through here so the
 * pattern stays consistent.
 */
class AdminAiInvoker
{
    /**
     * Run the given agent once. Throws whatever the SDK throws — the
     * caller is responsible for translating exceptions into operator
     * feedback (no swallowing here so failure modes stay visible).
     */
    public function invoke(
        Agent $agent,
        string $prompt,
        string $providerSlug,
        string $modelId,
        ?int $timeoutSeconds = null,
    ): AgentResponse {
        $args = [
            'prompt' => $prompt,
            'provider' => $this->resolveProvider($providerSlug),
            'model' => $modelId,
        ];

        $timeout = $timeoutSeconds ?? (int) config('ai.request_timeout', 300);
        if ($timeout > 0) {
            $args['timeout'] = $timeout;
        }

        return $agent->prompt(...$args);
    }

    /**
     * Resolve the provider Lab enum from the provider slug stored in
     * ai_providers.slug. Mirrors AiService::resolveProvider() so the
     * mapping stays consistent across pipelines.
     */
    private function resolveProvider(string $slug): Lab|string
    {
        return Lab::tryFrom($slug) ?? $slug;
    }
}

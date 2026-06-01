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

namespace App\Ai\Tracking\Listeners;

use App\Ai\Tracking\Pricing\PricingResolver;
use App\Ai\Tracking\TokenContext;
use App\Ai\Tracking\TokenRecorder;
use App\Ai\Tracking\TokenUsageData;
use Laravel\Ai\Events\AgentPrompted;
use Laravel\Ai\Responses\AgentResponse;

/**
 * Single subscriber on Laravel\Ai\Events\AgentPrompted.
 *
 * Pulls the task type / user id from the request-scoped Context
 * facade (set by {@see \App\Services\Ai\AiService::prompt}), looks up
 * pricing, and asks the recorder to persist a row. Failures are
 * swallowed inside the
 * recorder — never break a generation because tracking failed.
 */
class RecordTokenUsage
{
    public function __construct(
        private readonly TokenRecorder $recorder,
        private readonly PricingResolver $pricing,
    ) {}

    public function handle(AgentPrompted $event): void
    {
        $taskType = TokenContext::taskType();
        if ($taskType === null) {
            // Generation triggered outside our AiService entry point
            // (e.g. console commands, jobs without context). We could
            // record under a 'misc' bucket, but for now we skip to keep
            // analytics clean.
            return;
        }

        $response = $event->response;
        if (! $response instanceof AgentResponse) {
            // Streamed responses are tracked separately when the stream
            // completes. Skip the partial event here.
            return;
        }

        $providerSlug = $response->meta->provider;
        $modelId = $response->meta->model;

        $rates = $this->pricing->resolve($providerSlug, $modelId);

        $data = TokenUsageData::build(
            invocationId: $event->invocationId,
            taskType: $taskType,
            userId: TokenContext::userId(),
            providerSlug: $providerSlug,
            modelId: $modelId,
            usage: $response->usage,
            rates: $rates,
        );

        $this->recorder->record($data);
    }
}

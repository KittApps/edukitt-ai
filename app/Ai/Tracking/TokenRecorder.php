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

use App\Ai\Tracking\Analytics\TokenUsageAggregator;
use App\Models\AiTokenUsage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Persistence boundary for AI token usage rows.
 *
 * Two responsibilities:
 *   1. record(): write the row when the LLM call completes.
 *   2. linkSubject(): attach the polymorphic trackable after the
 *      caller has created the resulting domain model (e.g. Quiz).
 *
 * Both methods are tolerant of failures: if recording or linking
 * throws, the AI generation must NOT be affected. Token tracking is
 * an observability concern, not a business-critical path.
 */
class TokenRecorder
{
    public function __construct(
        private readonly TokenUsageAggregator $aggregator,
    ) {}

    public function record(TokenUsageData $data): ?AiTokenUsage
    {
        try {
            $row = AiTokenUsage::query()->create($data->toAttributes());
            $this->aggregator->flushFor();
            return $row;
        } catch (\Throwable $e) {
            Log::warning('[ai.tracking] failed to record token usage', [
                'invocation_id' => $data->invocationId,
                'task_type' => $data->taskType,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Attach the generated subject (Quiz/QuickLearn/Course/Lesson)
     * to the most recent token usage row matching the invocation id.
     *
     * Keyed by invocation_id rather than passing the row id around so
     * controllers stay decoupled from the recorder's return value.
     */
    public function linkSubject(string $invocationId, Model $subject): void
    {
        try {
            AiTokenUsage::query()
                ->where('invocation_id', $invocationId)
                ->update([
                    'trackable_type' => $subject->getMorphClass(),
                    'trackable_id' => $subject->getKey(),
                ]);
        } catch (\Throwable $e) {
            Log::warning('[ai.tracking] failed to link subject to token usage', [
                'invocation_id' => $invocationId,
                'subject' => $subject->getMorphClass().'#'.$subject->getKey(),
                'error' => $e->getMessage(),
            ]);
        }
    }
}

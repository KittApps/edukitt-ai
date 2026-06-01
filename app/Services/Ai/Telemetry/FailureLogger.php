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

namespace App\Services\Ai\Telemetry;

use App\Models\AiCallFailure;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Single point of failure-logging for real AI provider calls.
 *
 * Called from {@see \App\Services\Ai\AiService::invokeWithRetry()} on
 * the throw branch only. Tolerant of its own errors — a logger that
 * crashes inside a catch block must never mask the original exception.
 */
class FailureLogger
{
    public function record(
        Throwable $e,
        string $taskType,
        ?int $userId,
        ?string $providerSlug,
    ): void {
        try {
            AiCallFailure::create([
                'user_id' => $userId,
                'task_type' => $taskType,
                'provider_slug' => $providerSlug,
                'error_class' => $this->shortClass($e),
                'error_message' => $this->truncate($e->getMessage(), 1000),
                'created_at' => now(),
            ]);
        } catch (Throwable $loggerError) {
            // The original failure is already being surfaced upstream.
            // We just note that telemetry itself broke and move on.
            Log::warning('[ai-telemetry] failed to persist AiCallFailure row', [
                'logger_error' => $loggerError->getMessage(),
                'original_error' => $e->getMessage(),
            ]);
        }
    }

    private function shortClass(Throwable $e): string
    {
        return $this->truncate(get_class($e), 160);
    }

    private function truncate(string $value, int $max): string
    {
        if (mb_strlen($value) <= $max) {
            return $value;
        }
        return mb_substr($value, 0, $max - 1).'…';
    }
}

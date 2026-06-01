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

use Illuminate\Support\Facades\Context;

/**
 * Bridges {@see \App\Services\Ai\AiService::prompt()} and the
 * RecordTokenUsage listener.
 *
 * The Laravel\Ai\Events\AgentPrompted event does not carry application
 * context (which task type was being run, which user triggered it).
 * Instead of threading those values through every layer of the agent
 * package, AiService pushes them into Laravel's request-scoped Context
 * facade right before invoking the agent, and the listener reads them
 * back when the event fires.
 *
 * This keeps the agent layer fully user-agnostic and avoids modifying
 * vendor code or every individual agent class.
 */
final class TokenContext
{
    public const KEY_TASK_TYPE = 'ai.tracking.task_type';
    public const KEY_USER_ID = 'ai.tracking.user_id';

    public static function bind(string $taskType, ?int $userId): void
    {
        Context::add(self::KEY_TASK_TYPE, $taskType);
        if ($userId !== null) {
            Context::add(self::KEY_USER_ID, $userId);
        }
    }

    public static function clear(): void
    {
        Context::forget(self::KEY_TASK_TYPE);
        Context::forget(self::KEY_USER_ID);
    }

    public static function taskType(): ?string
    {
        $value = Context::get(self::KEY_TASK_TYPE);
        return is_string($value) ? $value : null;
    }

    public static function userId(): ?int
    {
        $value = Context::get(self::KEY_USER_ID);
        return is_int($value) ? $value : null;
    }
}

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

namespace App\Exceptions\Ai;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Raised by {@see \App\Services\Ai\TaskAssignmentResolver} when no
 * usable (provider, model) assignment can be produced for a task —
 * neither the requested task, the resolved cascade, nor the global
 * `default` fallback yielded anything generation-ready.
 *
 * Controllers catch this, log {@see self::detail()} server-side and
 * surface a generic "AI is unavailable right now" message to the
 * end user. We deliberately don't leak the configuration shape (was
 * it the default that's missing? the lesson's outline model?) into
 * the UI — that's an admin-side concern, not the user's.
 *
 * The {@see self::render()} method exposes that same user-facing
 * envelope so the queue path's
 * {@see \App\Services\Ai\Generation\ExceptionRenderer} can store and
 * surface it without duplicating the copy.
 */
class NoAvailableModelException extends RuntimeException
{
    public function __construct(
        public readonly string $taskKey,
        public readonly string $reason,
    ) {
        parent::__construct("No available AI model for task [{$taskKey}]: {$reason}");
    }

    /** Convenience factory for the "task default missing AND no global default" case. */
    public static function forTask(string $taskKey, string $reason = 'no default assignment configured'): self
    {
        return new self($taskKey, $reason);
    }

    /**
     * Structured payload for logger consumption. Keep small — this
     * is the diagnostic record an admin needs to fix the misconfig.
     *
     * @return array<string, string>
     */
    public function detail(): array
    {
        return [
            'task' => $this->taskKey,
            'reason' => $this->reason,
        ];
    }

    /**
     * User-facing response. Same generic copy the sync controllers'
     * `noModelResponse()` helper returns, kept here so the queue
     * path produces an identical envelope without re-stating the
     * message in a second place.
     */
    public function render(Request $request): Response
    {
        return new JsonResponse([
            'message' => 'AI generation is temporarily unavailable. Please try again shortly or contact your administrator.',
        ], 503);
    }
}

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

namespace App\Models;

use App\Services\Ai\Generation\PersistedResult;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Throwable;

/**
 * Tracks one AI generation request that runs on a worker.
 *
 * Lives in front of the queue-driven AI pipeline so the front-end can
 * poll for completion without needing a websocket. The wizard UX is
 * unchanged: whether queue mode is on or off, the user sees the same
 * "Generating..." view; on queued runs the front-end silently polls
 * {@see \App\Http\Controllers\App\AiGenerationController::status}
 * until this row reaches a terminal state.
 *
 * State machine:
 *   pending → running → (completed | failed)
 *
 * The row is the authoritative source of truth for the result of a
 * generation. The `subject_*` morph points at the persisted output
 * (Quiz, QuickLearn, Course, …) once it's been built, and
 * `redirect_url` is filled in by the persister so the polling endpoint
 * can hand the front-end a navigation target without re-deriving
 * routes per task.
 */
#[Fillable([
    'user_id',
    'task_key',
    'ai_content_task_assignment_id',
    'status',
    'input',
    'attachment_paths',
    'language',
    'subject_type',
    'subject_id',
    'redirect_url',
    'result_payload',
    'error_payload',
    'started_at',
    'completed_at',
])]
class AiGeneration extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_RUNNING = 'running';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected function casts(): array
    {
        return [
            'input' => 'array',
            'attachment_paths' => 'array',
            'result_payload' => 'array',
            'error_payload' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<AiContentTaskAssignment, $this> */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(AiContentTaskAssignment::class, 'ai_content_task_assignment_id');
    }

    /** @return MorphTo<Model, $this> */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function isTerminal(): bool
    {
        return $this->status === self::STATUS_COMPLETED
            || $this->status === self::STATUS_FAILED;
    }

    /**
     * Atomically flip pending → running and stamp `started_at`. Called
     * from the queue worker right after the job is dequeued so the
     * polling endpoint can show "in flight" rather than "queued".
     */
    public function markRunning(): void
    {
        $this->forceFill([
            'status' => self::STATUS_RUNNING,
            'started_at' => now(),
        ])->save();
    }

    /**
     * Finalise the generation with the persister's result. Supports
     * the two shapes any persister might produce:
     *
     *   - subject + redirect URL — Quick Learn, Quiz, Course Quiz.
     *     The wizard navigates away the moment the polling endpoint
     *     reports completed.
     *   - JSON payload only — Course Outline. The wizard advances to
     *     its Review step and renders the payload directly; the
     *     Course row is only created later when the user submits
     *     /courses (store).
     *
     * Either side may be null; the polling endpoint forwards both
     * verbatim to the front-end.
     */
    public function markCompleted(PersistedResult $result): void
    {
        $payload = [
            'status' => self::STATUS_COMPLETED,
            'redirect_url' => $result->redirectUrl,
            'result_payload' => $result->payload !== [] ? $result->payload : null,
            'completed_at' => now(),
        ];

        if ($result->subject !== null) {
            $payload['subject_type'] = $result->subject->getMorphClass();
            $payload['subject_id'] = $result->subject->getKey();
        }

        $this->forceFill($payload)->save();
    }

    /**
     * Record a failure with the same JSON envelope the sync path
     * would have returned from an exception's `render(Request)`
     * method — typically `{ok, reason, message, cta, ...}` for billing
     * exceptions or just `{message}` for generic errors. The polling
     * endpoint forwards this verbatim so the queued UX matches the
     * sync UX (same modal, same wording).
     *
     * @param  array<string, mixed>  $payload
     */
    public function markFailed(array $payload, ?Throwable $cause = null): void
    {
        $this->forceFill([
            'status' => self::STATUS_FAILED,
            'error_payload' => $payload,
            'completed_at' => now(),
        ])->save();
    }
}

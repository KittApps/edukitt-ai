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

namespace App\Services\Ai\Generation;

use App\Models\AiContentTaskAssignment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Files\Document;

/**
 * Self-contained, serialisable description of one AI generation.
 *
 * Built by the controller, handed to {@see AiGenerationDispatcher}
 * which either:
 *   - runs the matching {@see Contracts\Persister} synchronously, OR
 *   - persists it on an {@see \App\Models\AiGeneration} row and
 *     dispatches a {@see \App\Jobs\Ai\RunGenerationJob}.
 *
 * Same shape on both paths — persister code is identical whether the
 * AI call happens inline with the HTTP request or on a worker. The
 * DTO carries everything the persister needs: a pre-resolved
 * assignment id (so the resolver isn't invoked twice), the acting
 * user, the language to thread into the agent, and a per-task
 * `input` map.
 *
 * Attachments are tricky because raw {@see UploadedFile} objects
 * don't survive serialisation. Two parallel fields handle both
 * paths and {@see self::attachments()} hides the difference from
 * persisters:
 *
 *   - `attachmentPaths` — relative paths on the `local` disk,
 *     used by the queue path. Set by the dispatcher after it
 *     persists the uploads to disk.
 *   - `inMemoryAttachments` — laravel/ai {@see Document} instances
 *     built from in-flight uploads, used by the sync path so we
 *     don't have to touch the disk at all for a request that never
 *     leaves the worker.
 *
 * The DTO only serialises the first one. The second is constructor-
 * injected by the dispatcher on the sync path and never round-trips.
 */
final class GenerationRequest
{
    /**
     * @param  array<string, mixed>  $input  Per-task payload. Each persister
     *         documents the shape it expects in its own docblock.
     * @param  array<int, string>  $attachmentPaths  Relative paths on the
     *         `local` disk. The job cleans these up after it runs.
     * @param  array<int, Document>  $inMemoryAttachments  laravel/ai files
     *         built from in-flight uploads (sync path only).
     */
    public function __construct(
        public readonly string $taskKey,
        public readonly int $userId,
        public readonly int $assignmentId,
        public readonly ?string $language,
        public readonly array $input,
        public readonly array $attachmentPaths = [],
        private readonly array $inMemoryAttachments = [],
    ) {}

    /**
     * Return the attachments in a shape any agent can consume.
     *
     * On the sync path this is the in-memory list the dispatcher
     * built from the HTTP request. On the queue path we lazily
     * rebuild laravel/ai {@see Document} instances from the stored
     * paths. Missing files are silently dropped — by the time the
     * worker picks the job up, an admin could already have wiped
     * the upload folder.
     *
     * @return array<int, Document>
     */
    public function attachments(): array
    {
        if ($this->inMemoryAttachments !== []) {
            return $this->inMemoryAttachments;
        }

        $out = [];
        foreach ($this->attachmentPaths as $path) {
            if (! is_string($path) || $path === '') {
                continue;
            }
            if (! Storage::disk('local')->exists($path)) {
                continue;
            }
            $out[] = Document::fromPath(Storage::disk('local')->path($path));
        }

        return $out;
    }

    /**
     * Reload the User from the database. We don't keep a User
     * reference on the DTO so it stays cleanly serialisable; the
     * worker rehydrates the model when it actually needs it.
     */
    public function user(): User
    {
        /** @var User $user */
        $user = User::query()->findOrFail($this->userId);

        return $user;
    }

    /**
     * Reload the assignment with provider + model eager-loaded so
     * the persister can hand it straight to
     * {@see \App\Services\Ai\AiService::prompt}.
     */
    public function assignment(): AiContentTaskAssignment
    {
        /** @var AiContentTaskAssignment $assignment */
        $assignment = AiContentTaskAssignment::query()
            ->with(['provider', 'model'])
            ->findOrFail($this->assignmentId);

        return $assignment;
    }

    /**
     * Flatten for queue serialisation. Drops `inMemoryAttachments`
     * since those are exclusively for the sync path.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'task_key' => $this->taskKey,
            'user_id' => $this->userId,
            'assignment_id' => $this->assignmentId,
            'language' => $this->language,
            'input' => $this->input,
            'attachment_paths' => $this->attachmentPaths,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            taskKey: (string) $data['task_key'],
            userId: (int) $data['user_id'],
            assignmentId: (int) $data['assignment_id'],
            language: isset($data['language']) ? (string) $data['language'] : null,
            input: (array) ($data['input'] ?? []),
            attachmentPaths: (array) ($data['attachment_paths'] ?? []),
        );
    }
}

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

use App\Jobs\Ai\RunGenerationJob;
use App\Models\AiContentTaskAssignment;
use App\Models\AiGeneration;
use App\Services\Queue\QueueSettingsResolver;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Laravel\Ai\Files\Document;

/**
 * Single entry point controllers use to run any AI generation.
 *
 * Branches on the admin queue toggle:
 *
 *   Toggle OFF — runs the matching {@see Contracts\Persister} inline
 *   with the HTTP request. Returns a fully-populated {@see DispatchResult}
 *   the controller can convert into the same response shape it had
 *   before this feature existed.
 *
 *   Toggle ON — persists an {@see AiGeneration} row, stashes any
 *   uploaded files on the local disk so they survive serialisation,
 *   and dispatches a {@see RunGenerationJob} onto a per-provider
 *   queue derived from the resolved assignment's provider slug
 *   (`ai-openai`, `ai-anthropic`, `ai-gemini`, …). Returns a
 *   queued-shaped result the front-end can poll on.
 *
 * Either way, the controller hands the same shape downstream:
 *   - sync   → {redirect, payload, subject}
 *   - queued → {generation_id, queued: true}
 *
 * Front-end uses one tiny helper (`submitAiGeneration`) to abstract
 * over the two, so the wizard UX is identical to the user.
 */
class AiGenerationDispatcher
{
    public function __construct(
        private readonly PersisterRegistry $registry,
        private readonly QueueSettingsResolver $queueSettings,
    ) {}

    /**
     * Run a generation synchronously OR dispatch it to the queue,
     * depending on the admin toggle.
     *
     * @param  array<int, UploadedFile>  $uploadedFiles  Raw uploads from the
     *         current HTTP request. Persisted to the local disk (queue
     *         path only) so the worker can pick them up later.
     */
    public function dispatch(
        string $taskKey,
        int $userId,
        AiContentTaskAssignment $assignment,
        ?string $language,
        array $input,
        array $uploadedFiles = [],
    ): DispatchResult {
        if (! $this->queueSettings->isAiGenerationQueueEnabled()) {
            return $this->runSync($taskKey, $userId, $assignment, $language, $input, $uploadedFiles);
        }

        return $this->dispatchQueued($taskKey, $userId, $assignment, $language, $input, $uploadedFiles);
    }

    /**
     * @param  array<int, UploadedFile>  $uploadedFiles
     */
    private function runSync(
        string $taskKey,
        int $userId,
        AiContentTaskAssignment $assignment,
        ?string $language,
        array $input,
        array $uploadedFiles,
    ): DispatchResult {
        $request = new GenerationRequest(
            taskKey: $taskKey,
            userId: $userId,
            assignmentId: $assignment->id,
            language: $language,
            input: $input,
            // Sync path bypasses the disk entirely — convert uploads
            // straight to laravel/ai Document objects so the persister's
            // attachments() accessor returns them as-is.
            inMemoryAttachments: array_map(
                fn (UploadedFile $f) => Document::fromUpload($f),
                array_values($uploadedFiles),
            ),
        );

        $persister = $this->registry->for($taskKey);
        $result = $persister->run($request);

        return DispatchResult::sync($result);
    }

    /**
     * @param  array<int, UploadedFile>  $uploadedFiles
     */
    private function dispatchQueued(
        string $taskKey,
        int $userId,
        AiContentTaskAssignment $assignment,
        ?string $language,
        array $input,
        array $uploadedFiles,
    ): DispatchResult {
        $attachmentPaths = $this->storeUploads($uploadedFiles);

        /** @var AiGeneration $generation */
        $generation = AiGeneration::query()->create([
            'user_id' => $userId,
            'task_key' => $taskKey,
            'ai_content_task_assignment_id' => $assignment->id,
            'status' => AiGeneration::STATUS_PENDING,
            'input' => $input,
            'attachment_paths' => $attachmentPaths,
            'language' => $language,
        ]);

        $request = new GenerationRequest(
            taskKey: $taskKey,
            userId: $userId,
            assignmentId: $assignment->id,
            language: $language,
            input: $input,
            attachmentPaths: $attachmentPaths,
        );

        $queueName = $this->queueNameFor($assignment);

        RunGenerationJob::dispatch($generation->id, $request->toArray())
            ->onQueue($queueName);

        return DispatchResult::queued($generation);
    }

    /**
     * Per-provider queue lane: `ai-{providerSlug}` so each provider
     * gets its own Horizon supervisor and a stuck OpenAI request
     * can't starve Gemini (or vice versa). Unknown / missing
     * provider falls back to the generic `ai` queue so nothing
     * silently stalls if an admin adds a new provider before the
     * operator updates {@see config/horizon.php}.
     */
    private function queueNameFor(AiContentTaskAssignment $assignment): string
    {
        $slug = $assignment->provider?->slug;
        if (! is_string($slug) || $slug === '') {
            return QueueSettingsResolver::AI_QUEUE_NAME;
        }

        return QueueSettingsResolver::AI_QUEUE_NAME.'-'.Str::slug($slug);
    }

    /**
     * Move uploaded files to the local disk so they survive past the
     * request that triggered them. Each generation gets its own
     * sub-folder under `ai-generations/{uuid}/` so cleanup after the
     * job finishes is a one-folder delete.
     *
     * @param  array<int, UploadedFile>  $uploads
     * @return array<int, string>  relative paths on the `local` disk
     */
    private function storeUploads(array $uploads): array
    {
        if ($uploads === []) {
            return [];
        }

        $folder = 'ai-generations/'.Str::uuid();
        $paths = [];
        foreach ($uploads as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }
            $stored = $file->storeAs(
                $folder,
                Str::uuid().'-'.$file->getClientOriginalName(),
                ['disk' => 'local'],
            );
            if (is_string($stored) && $stored !== '') {
                $paths[] = $stored;
            }
        }

        return $paths;
    }
}

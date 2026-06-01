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

namespace App\Jobs\Ai;

use App\Models\AiGeneration;
use App\Services\Ai\Generation\ExceptionRenderer;
use App\Services\Ai\Generation\GenerationRequest;
use App\Services\Ai\Generation\PersisterRegistry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Single queued job that runs any AI generation registered with the
 * {@see PersisterRegistry}.
 *
 * Why one job class for all task types:
 *
 *   - The work is structurally identical (look up persister, run it,
 *     stamp the AiGeneration row, surface errors). Per-task jobs
 *     would just duplicate the lifecycle plumbing.
 *
 *   - Per-provider queue isolation is decided at dispatch time by
 *     {@see \App\Services\Ai\Generation\AiGenerationDispatcher}
 *     (the only place that knows the resolved assignment's provider
 *     slug). That keeps queue naming logic out of the job itself.
 *
 * The job:
 *
 *   1. Flips the row to `running` so the polling endpoint can report
 *      "in flight" rather than "queued".
 *   2. Looks up the persister and runs it.
 *   3. On success: stamps subject / redirect / payload onto the row.
 *   4. On failure: stamps a sanitised user-facing message; the real
 *      exception is logged for ops.
 *   5. Either way: cleans up uploaded attachments so the local disk
 *      doesn't accumulate stale PDF/DOCX leftovers.
 *
 * `failOnTimeout` is true so a hung LLM call eventually surfaces as
 * a failed generation rather than silently retrying forever.
 */
class RunGenerationJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 300;

    public bool $failOnTimeout = true;

    /**
     * @param  array<string, mixed>  $requestPayload  Already-flattened
     *         {@see GenerationRequest::toArray()} payload — Laravel's
     *         queue serialiser is happier with primitive arrays than
     *         with a custom DTO instance.
     */
    public function __construct(
        public readonly int $generationId,
        public readonly array $requestPayload,
    ) {}

    public function handle(PersisterRegistry $registry, ExceptionRenderer $renderer): void
    {
        /** @var AiGeneration|null $generation */
        $generation = AiGeneration::query()->find($this->generationId);
        if ($generation === null) {
            // Row was deleted (admin cleanup, GDPR, …) between dispatch
            // and pickup — nothing to do.
            return;
        }

        $request = GenerationRequest::fromArray($this->requestPayload);

        $generation->markRunning();

        try {
            $persister = $registry->for($request->taskKey);
            $result = $persister->run($request);
            $generation->markCompleted($result);
        } catch (Throwable $e) {
            Log::error('AI generation job failed.', [
                'generation_id' => $generation->id,
                'task_key' => $request->taskKey,
                'user_id' => $request->userId,
                'error' => $e->getMessage(),
            ]);

            // Render the exception through the same `render()` method
            // the sync path uses so the polling endpoint can surface
            // the rich envelope (billing 402, no-model 503, …). This
            // is the single source of truth for "what does the user
            // see when an AI generation fails?" — no duplication
            // between the controller and the worker.
            $rendered = $renderer->render($e);
            $generation->markFailed($rendered['payload'], $e);
        } finally {
            $this->cleanupAttachments($request->attachmentPaths);
        }
    }

    /**
     * Called by the framework when the job throws past our own catches
     * (e.g. fatal worker crash, OOM). Marks the row as failed so the
     * front-end polling stops spinning forever.
     */
    public function failed(Throwable $e): void
    {
        /** @var AiGeneration|null $generation */
        $generation = AiGeneration::query()->find($this->generationId);
        if ($generation === null || $generation->isTerminal()) {
            return;
        }

        $rendered = app(ExceptionRenderer::class)->render($e);
        $generation->markFailed($rendered['payload'], $e);

        $this->cleanupAttachments(
            (array) ($this->requestPayload['attachment_paths'] ?? []),
        );
    }

    /**
     * Best-effort deletion of the uploaded files the controller stashed
     * before dispatch. Logged on failure but never raised — the
     * generation already finished by this point.
     *
     * @param  array<int, string>  $paths
     */
    private function cleanupAttachments(array $paths): void
    {
        foreach ($paths as $path) {
            if (! is_string($path) || $path === '') {
                continue;
            }
            try {
                Storage::disk('local')->delete($path);
            } catch (Throwable $e) {
                Log::warning('Failed to clean up AI generation attachment.', [
                    'generation_id' => $this->generationId,
                    'path' => $path,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Each generation gets its own folder (see dispatcher). Try to
        // remove the empty parent so the local disk stays tidy.
        if ($paths !== []) {
            $firstPath = (string) $paths[0];
            $folder = trim(dirname($firstPath), '.');
            if ($folder !== '' && $folder !== '/' && $folder !== '\\') {
                try {
                    $disk = Storage::disk('local');
                    if ($disk->exists($folder) && empty($disk->files($folder))) {
                        $disk->deleteDirectory($folder);
                    }
                } catch (Throwable) {
                    // ignore — purely cosmetic cleanup.
                }
            }
        }
    }
}

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

namespace App\Services;

use App\Ai\Agents\ContentSummaryAgent;
use App\Services\Ai\AiService;

/**
 * Thin facade over {@see ContentSummaryAgent} for callers that just want
 * "summarize these attachments for this topic" without assembling the
 * prompt themselves.
 *
 * Returns null (not an empty string) when there is nothing to summarize,
 * so the caller can skip passing a `resource_context` / `content_context`
 * arg into downstream agents.
 */
class ContentSummaryService
{
    public function __construct(private readonly AiService $ai) {}

    /**
     * Summarize the supplied attachments. No-op when the list is empty.
     *
     * Accepts anything laravel/ai recognises as an attachment — most
     * commonly {@see \Illuminate\Http\UploadedFile} (sync controller
     * path) or {@see \Laravel\Ai\Files\Document} instances built from
     * stored paths (queue path, where UploadedFile objects don't
     * survive serialisation).
     *
     * @param  array<int, mixed>  $attachments
     */
    public function summarize(array $attachments, string $topic, ?int $userId = null): ?string
    {
        if (empty($attachments)) {
            return null;
        }

        $agent = new ContentSummaryAgent(topic: $topic);

        $response = $this->ai->prompt(
            agent: $agent,
            prompt: "Summarize the attached material for the topic: {$topic}",
            taskType: ContentSummaryAgent::TASK_TYPE,
            attachments: $attachments,
            userId: $userId,
        );

        $text = trim((string) ($response->text ?? ''));

        if ($text === '' || $text === 'No relevant material found.') {
            return null;
        }

        return $text;
    }
}

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

namespace App\Services\Ai\Generation\Persisters;

use App\Ai\Agents\CourseOutlineAgent;
use App\Services\Ai\AiService;
use App\Services\Ai\Generation\Contracts\Persister;
use App\Services\Ai\Generation\GenerationRequest;
use App\Services\Ai\Generation\PersistedResult;
use App\Services\ContentSummaryService;

/**
 * Persister for the Course Outline wizard step.
 *
 * The AI step here is two calls in sequence (content summary, then
 * outline). Both run inside the same job/request — the content
 * summary doesn't get its own queue hop because it's already on a
 * worker by the time the outline persister runs.
 *
 * The result is the outline JSON itself (title, description, modules).
 * No Course is created at this stage — the wizard's Review step
 * renders the payload, the user can edit it, and only the subsequent
 * POST /courses (store) actually persists a Course. So this persister
 * returns a payload-shaped {@see PersistedResult}: no subject, no
 * redirect; the wizard advances to its next step on its own.
 *
 * Expected `input` shape:
 *   - topic                    string  Required.
 *   - preferences              array   User preferences map (may be empty).
 *   - regenerate_instructions  ?string Optional regenerate prompt addition.
 *
 * Attachments are abstracted by {@see GenerationRequest::attachments()}:
 * sync path returns laravel/ai Document instances built from the
 * in-flight HTTP uploads; queue path reads them back from disk by
 * the same accessor. The persister never needs to know which path
 * it's on.
 */
class CourseOutlinePersister implements Persister
{
    public function __construct(
        private readonly AiService $ai,
        private readonly ContentSummaryService $contentSummary,
    ) {}

    public function taskKey(): string
    {
        return 'course_outline';
    }

    public function run(GenerationRequest $request): PersistedResult
    {
        $topic = (string) ($request->input['topic'] ?? '');
        $preferences = (array) ($request->input['preferences'] ?? []);
        $regenerateInstructions = $request->input['regenerate_instructions'] ?? null;

        $attachments = $request->attachments();

        // Pre-digest uploaded resources with the cheaper summary model so
        // the outline agent gets compact text instead of raw PDFs.
        $resourceContext = $attachments !== []
            ? $this->contentSummary->summarize($attachments, $topic, $request->userId)
            : null;

        $agent = new CourseOutlineAgent(
            topic: $topic,
            preferences: $preferences,
            resourceContext: $resourceContext,
            regenerateInstructions: $regenerateInstructions,
            language: $request->language,
        );

        $response = $this->ai->prompt(
            agent: $agent,
            prompt: "Generate a comprehensive course outline for: {$topic}",
            taskType: 'course_outline',
            userId: $request->userId,
            assignment: $request->assignment(),
        );

        return PersistedResult::payload([
            'title' => $response['title'] ?? null,
            'description' => $response['description'] ?? null,
            'outline' => $response['modules'],
        ]);
    }
}

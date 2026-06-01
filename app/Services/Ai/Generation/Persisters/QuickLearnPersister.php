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

use App\Ai\Agents\QuickLearnAgent;
use App\Models\QuickLearn;
use App\Services\Ai\AiService;
use App\Services\Ai\Generation\Contracts\Persister;
use App\Services\Ai\Generation\GenerationRequest;
use App\Services\Ai\Generation\PersistedResult;

/**
 * Persister for the Quick Learn wizard.
 *
 * Mirrors the logic that previously lived inline in
 * {@see \App\Http\Controllers\App\QuickLearnController::generate} so
 * the same code runs whether the AI call is invoked synchronously
 * from the controller or via {@see \App\Jobs\Ai\RunGenerationJob} on
 * a worker.
 *
 * Expected `input` shape:
 *   - topic       string  Required.
 *   - preferences array   User preferences map (may be empty).
 */
class QuickLearnPersister implements Persister
{
    public function __construct(private readonly AiService $ai) {}

    public function taskKey(): string
    {
        return 'quick_learn';
    }

    public function run(GenerationRequest $request): PersistedResult
    {
        $topic = (string) ($request->input['topic'] ?? '');
        $preferences = (array) ($request->input['preferences'] ?? []);

        $assignment = $request->assignment();

        $agent = new QuickLearnAgent(
            topic: $topic,
            preferences: $preferences,
            language: $request->language,
        );

        $response = $this->ai->prompt(
            agent: $agent,
            prompt: "Create a quick learn lesson about: {$topic}",
            taskType: 'quick_learn',
            userId: $request->userId,
            assignment: $assignment,
        );

        $quickLearn = QuickLearn::create([
            'user_id' => $request->userId,
            'title' => $response['title'],
            'description' => $response['description'],
            'topic' => $topic,
            'preferences' => $preferences,
            'language' => $request->language,
            'ai_model_name' => $assignment->model?->name,
            'content' => $response['sections'],
            'is_generated' => true,
            'status' => 'active',
        ]);

        $this->ai->linkUsage($response, $quickLearn);

        return PersistedResult::subject(
            $quickLearn,
            // Path-only URL so the browser uses the current host. The
            // queue worker has no HTTP request context, so an absolute
            // route() would fall back to APP_URL and might point at
            // the wrong host.
            route('app.quick-learns.show', $quickLearn, absolute: false),
        );
    }
}

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

use App\Services\Ai\Generation\Contracts\Persister;
use InvalidArgumentException;

/**
 * Map of `task_key` → {@see Persister} implementation.
 *
 * Wired in {@see \App\Providers\AppServiceProvider} once at boot. The
 * dispatcher and the queue job both go through here to look up which
 * persister knows how to run a given generation, so adding a new
 * top-level flow is a two-line change: implement a Persister, bind
 * it in the provider.
 */
class PersisterRegistry
{
    /** @var array<string, Persister> */
    private array $persisters = [];

    public function register(Persister $persister): void
    {
        $this->persisters[$persister->taskKey()] = $persister;
    }

    public function for(string $taskKey): Persister
    {
        if (! isset($this->persisters[$taskKey])) {
            throw new InvalidArgumentException(
                "No persister registered for AI task key [{$taskKey}]. ".
                'Either register one in AppServiceProvider or call AiService::prompt() directly.',
            );
        }

        return $this->persisters[$taskKey];
    }

    public function has(string $taskKey): bool
    {
        return isset($this->persisters[$taskKey]);
    }

    /**
     * @return array<int, string>
     */
    public function taskKeys(): array
    {
        return array_keys($this->persisters);
    }
}

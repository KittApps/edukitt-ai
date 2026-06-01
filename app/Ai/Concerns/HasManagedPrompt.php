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

namespace App\Ai\Concerns;

use App\Services\PromptService;

/**
 * Mix into any AI agent whose system prompt is admin-editable.
 *
 * Contract for the consuming class:
 *  - Declare a `public const TASK_TYPE = '...';` matching a key in
 *    {@see PromptService::SUPPORTED_TASKS}.
 *  - Implement {@see runtimeValues()} returning the substitution map
 *    used by strtr() at invocation time, e.g. ['{topic}' => $topic].
 *  - Implement static {@see defaultInstructionsTemplate()} returning
 *    the factory-default template (with {placeholder} tokens, no
 *    interpolation) — used by the admin "Reset to default" button.
 *  - Implement static {@see placeholders()} returning metadata about
 *    each placeholder for the admin editor UI.
 */
trait HasManagedPrompt
{
    public function instructions(): string
    {
        /** @var PromptService $service */
        $service = app(PromptService::class);
        $task = (string) constant(static::class . '::TASK_TYPE');
        $template = $service->currentTemplate($task);

        return strtr($template, $this->runtimeValues());
    }

    /**
     * Map of placeholder token => current value for substitution.
     * Tokens should include the surrounding braces, e.g. '{topic}'.
     *
     * @return array<string, string>
     */
    abstract protected function runtimeValues(): array;
}

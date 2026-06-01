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
use App\Ai\Agents\CourseOutlineAgent;
use App\Ai\Agents\LessonContentAgent;
use App\Ai\Agents\QuickLearnAgent;
use App\Ai\Agents\QuizAgent;
use App\Models\Setting;
use InvalidArgumentException;

/**
 * Single source of truth for the admin-editable AI system prompts.
 *
 * Each supported task maps 1-to-1 to an Agent class. The factory
 * default template lives in the agent (so engineers own it), the
 * admin override lives in the `settings` table under the
 * `ai_prompt` group keyed by task_type.
 */
class PromptService
{
    public const PROMPT_SETTING_GROUP = 'ai_prompt';

    /**
     * Map of task_type => agent class. Add new entries here to expose
     * a new task in the admin Prompt editor.
     *
     * @var array<string, class-string>
     */
    private const AGENTS = [
        'quick_learn' => QuickLearnAgent::class,
        'course_outline' => CourseOutlineAgent::class,
        'course_lesson' => LessonContentAgent::class,
        'quiz_generate' => QuizAgent::class,
        'content_summary' => ContentSummaryAgent::class,
    ];

    /**
     * Tasks that expose a Prompt tab in the admin UI.
     */
    public const SUPPORTED_TASKS = [
        'quick_learn',
        'course_outline',
        'course_lesson',
        'quiz_generate',
        'content_summary',
    ];

    /**
     * The factory-default template for a task, as written in the
     * agent class. Used by the admin "Reset to default" action and
     * as the fallback when no DB override exists.
     */
    public function defaultTemplate(string $task): string
    {
        $agent = $this->agentClass($task);

        return $agent::defaultInstructionsTemplate();
    }

    /**
     * Placeholder metadata for the admin Prompt editor UI.
     *
     * @return array<int, array{token: string, label: string, description: string, sample: string}>
     */
    public function placeholders(string $task): array
    {
        $agent = $this->agentClass($task);

        return $agent::placeholders();
    }

    /**
     * The template actually used at AI invocation time: admin
     * override if set, factory default otherwise.
     */
    public function currentTemplate(string $task): string
    {
        $custom = Setting::get(self::PROMPT_SETTING_GROUP, $task);

        return is_string($custom) && trim($custom) !== ''
            ? $custom
            : $this->defaultTemplate($task);
    }

    public function setTemplate(string $task, string $template): void
    {
        $this->guard($task);
        Setting::set(self::PROMPT_SETTING_GROUP, $task, $template);
    }

    public function resetTemplate(string $task): void
    {
        $this->guard($task);
        Setting::query()
            ->where('group', self::PROMPT_SETTING_GROUP)
            ->where('key', $task)
            ->delete();
    }

    public function hasCustomTemplate(string $task): bool
    {
        $this->guard($task);

        return Setting::query()
            ->where('group', self::PROMPT_SETTING_GROUP)
            ->where('key', $task)
            ->exists();
    }

    /**
     * @return class-string
     */
    private function agentClass(string $task): string
    {
        $this->guard($task);

        return self::AGENTS[$task];
    }

    private function guard(string $task): void
    {
        if (!isset(self::AGENTS[$task])) {
            throw new InvalidArgumentException("Unknown AI prompt task type: {$task}");
        }
    }
}

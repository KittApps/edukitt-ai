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

namespace App\Http\Controllers\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\SaveTaskAssignmentsRequest;
use App\Http\Requests\Admin\Settings\SaveTaskConfigurationRequest;
use App\Models\AiContentTask;
use App\Models\AiProvider;
use App\Services\Ai\AiContentGlobalConfig;
use App\Services\PersonalizeOptionsService;
use App\Services\PromptService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AiContentController extends Controller
{
    public function __construct(
        private readonly PersonalizeOptionsService $personalize,
        private readonly PromptService $prompts,
        private readonly AiContentGlobalConfig $globalConfig,
    ) {}

    public function index()
    {
        $personalizeTasks = PersonalizeOptionsService::SUPPORTED_TASKS;

        $tasks = AiContentTask::query()
            ->ordered()
            ->with([
                'assignments' => fn ($q) => $q->orderByDesc('is_default')->orderBy('sort_order'),
                'assignments.provider:id,name,slug',
                'assignments.model:id,ai_provider_id,name,model_id',
            ])
            ->get()
            ->map(fn (AiContentTask $task) => [
                'id' => $task->id,
                'key' => $task->key,
                'label' => $task->label,
                'description' => $task->description,
                'is_internal' => $task->is_internal,
                'allows_multiple' => $task->allowsMultipleAssignments(),
                'assignments' => $task->assignments->map(fn ($a) => [
                    'id' => $a->id,
                    'ai_provider_id' => $a->ai_provider_id,
                    'ai_provider_model_id' => $a->ai_provider_model_id,
                    'temperature' => (float) $a->temperature,
                    'max_tokens' => (int) $a->max_tokens,
                    'is_default' => (bool) $a->is_default,
                    'is_paid_only' => (bool) $a->is_paid_only,
                    'sort_order' => (int) $a->sort_order,
                ])->values()->all(),
                'config' => [
                    'personalize_enabled' => (bool) $task->personalize_enabled,
                    'resources_enabled' => (bool) $task->resources_enabled,
                    'resources_max_files' => (int) $task->resources_max_files,
                    'resources_max_file_size_mb' => (int) $task->resources_max_file_size_mb,
                ],
                'applicable_config' => $task->applicableConfigKeys($personalizeTasks),
            ]);

        return Inertia::render('Admin/Settings/AiContent', [
            'tasks' => $tasks,
            'providers' => AiProvider::active()
                ->with(['models' => fn ($q) => $q->where('is_active', true)])
                ->get(),
            'personalizeGroups' => $this->collectPersonalizeGroups(),
            'personalizeTasks' => $personalizeTasks,
            'prompts' => $this->collectPrompts(),
            'promptTasks' => PromptService::SUPPORTED_TASKS,
            'globalConfig' => $this->globalConfig->snapshot(),
        ]);
    }

    /**
     * Save the per-task admin Configuration (Personalize on/off,
     * resources upload toggle + limits, …). Only keys applicable to
     * the resolved task are written; everything else is silently
     * dropped.
     */
    public function saveTaskConfiguration(SaveTaskConfigurationRequest $request, AiContentTask $task)
    {
        $payload = $request->applicableData(
            $task,
            PersonalizeOptionsService::SUPPORTED_TASKS,
        );

        if ($payload !== []) {
            $task->fill($payload)->save();
        }

        return back()->with('success', 'Task configuration updated.');
    }

    /**
     * Save the global AI-content behaviour switches (whether the user
     * can pick a model on the generation form, whether the language
     * selector is shown, the supported languages list, …).
     *
     * Edited from the Default task's "Configuration" and
     * "Supported Languages" sub-tabs, which each ship only their own
     * slice of the payload — hence every key is `sometimes`. The
     * service only writes the keys that are actually present, so a
     * partial submission updates only that slice.
     */
    public function updateGlobalConfig(Request $request)
    {
        $langKey = AiContentGlobalConfig::KEY_SUPPORTED_LANGUAGES;

        $data = $request->validate([
            AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL => ['sometimes', 'boolean'],
            AiContentGlobalConfig::KEY_MERGE_COURSE_GENERATION => ['sometimes', 'boolean'],
            AiContentGlobalConfig::KEY_SHOW_LANGUAGE_SELECTOR => ['sometimes', 'boolean'],
            $langKey => ['sometimes', 'array'],
            "$langKey.*.code" => ['required_with:'.$langKey, 'string', 'max:8', 'regex:/^[a-zA-Z][a-zA-Z\-]*$/'],
            "$langKey.*.name" => ['required_with:'.$langKey, 'string', 'max:64'],
            "$langKey.*.is_default" => ['nullable', 'boolean'],
        ]);

        $this->globalConfig->save($data);

        return back()->with('success', 'AI content configuration updated.');
    }

    /**
     * Replace the (provider, model) assignments for a single task.
     *
     * Bulk replace rather than per-row CRUD so the admin UI can
     * build the table client-side and ship one atomic payload. The
     * old rows are deleted and the submitted set is reinserted in a
     * single transaction; the unique (task, provider, model) index
     * keeps us honest if two admins save concurrently.
     */
    public function saveAssignments(SaveTaskAssignmentsRequest $request, AiContentTask $task)
    {
        $assignments = $request->validated('assignments', []);

        // Single-row tasks: force is_default on the lone row so the
        // resolver can always find a default. Keeps the UI free of
        // a meaningless radio for default/internal tasks.
        if (! $task->allowsMultipleAssignments() && count($assignments) === 1) {
            $assignments[0]['is_default'] = true;
        }

        DB::transaction(function () use ($task, $assignments) {
            $task->assignments()->delete();

            foreach ($assignments as $index => $a) {
                $task->assignments()->create([
                    'ai_provider_id' => $a['ai_provider_id'],
                    'ai_provider_model_id' => $a['ai_provider_model_id'],
                    'temperature' => $a['temperature'] ?? 0.70,
                    'max_tokens' => $a['max_tokens'] ?? 4096,
                    'is_default' => (bool) ($a['is_default'] ?? false),
                    'is_paid_only' => (bool) ($a['is_paid_only'] ?? false),
                    'sort_order' => $a['sort_order'] ?? $index,
                ]);
            }
        });

        return back()->with('success', 'AI provider assignments updated.');
    }

    /**
     * Replace the personalize groups + options for a single task type.
     * Receives the same shape rendered by PersonalizeOptionsCard.
     */
    public function updatePersonalize(Request $request, string $task)
    {
        abort_unless(in_array($task, PersonalizeOptionsService::SUPPORTED_TASKS, true), 404);

        $request->validate([
            'groups' => 'required|array',
            'groups.*.id' => 'nullable|string|max:64',
            'groups.*.label' => 'required|string|max:255',
            'groups.*.description' => 'nullable|string',
            'groups.*.options' => 'nullable|array',
            'groups.*.options.*.id' => 'nullable|string|max:64',
            'groups.*.options.*.value' => 'required|string|max:255',
            'groups.*.options.*.is_default' => 'nullable|boolean',
        ]);

        $this->personalize->replaceGroupsForTask($task, $request->input('groups', []));

        return back()->with('success', 'Personalize options updated.');
    }

    /**
     * Save an admin-edited system prompt for a task.
     */
    public function updatePrompt(Request $request, string $task)
    {
        abort_unless(in_array($task, PromptService::SUPPORTED_TASKS, true), 404);

        $request->validate([
            'template' => 'required|string|min:10|max:20000',
        ]);

        $this->prompts->setTemplate($task, $request->input('template'));

        return back()->with('success', 'Prompt updated.');
    }

    /**
     * Clear the admin override for a task, letting the factory-default
     * (defined on the agent class) take effect again.
     */
    public function resetPrompt(string $task)
    {
        abort_unless(in_array($task, PromptService::SUPPORTED_TASKS, true), 404);

        $this->prompts->resetTemplate($task);

        return back()->with('success', 'Prompt reset to default.');
    }

    /**
     * @return array<string, array{template: string, default: string, placeholders: array<int, array<string, string>>, has_custom: bool}>
     */
    private function collectPrompts(): array
    {
        $payload = [];
        foreach (PromptService::SUPPORTED_TASKS as $task) {
            $payload[$task] = [
                'template' => $this->prompts->currentTemplate($task),
                'default' => $this->prompts->defaultTemplate($task),
                'placeholders' => $this->prompts->placeholders($task),
                'has_custom' => $this->prompts->hasCustomTemplate($task),
            ];
        }

        return $payload;
    }

    /**
     * Return personalize groups keyed by task type, only for the tasks
     * the admin UI currently exposes a Personalize tab for.
     *
     * @return array<string, array<int, mixed>>
     */
    private function collectPersonalizeGroups(): array
    {
        $payload = [];
        foreach (PersonalizeOptionsService::SUPPORTED_TASKS as $task) {
            $payload[$task] = $this->personalize->groupsForTask($task)
                ->map(fn ($group) => [
                    'id' => $group->key,
                    'label' => $group->label,
                    'description' => $group->description,
                    'options' => $group->options->map(fn ($option) => [
                        'id' => $option->key,
                        'value' => $option->value,
                        'is_default' => $option->is_default,
                    ])->values()->all(),
                ])
                ->values()
                ->all();
        }

        return $payload;
    }
}

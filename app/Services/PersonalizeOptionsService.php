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

use App\Models\PersonalizeOption;
use App\Models\PersonalizeOptionGroup;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Single source of truth for the admin-managed Personalize Options:
 * groups + their selectable options per AI task type
 * (e.g. 'quick_learn', 'course_outline', 'quiz_generate').
 *
 * The user-facing wizard, the admin editor, and the agent-side
 * preference validation all read through this service.
 */
class PersonalizeOptionsService
{
    /**
     * Tasks that expose a Personalize tab in the admin UI.
     */
    public const SUPPORTED_TASKS = [
        'quick_learn',
        'course_outline',
        'quiz_generate',
    ];

    /**
     * Active groups + active options for a given task type, ordered
     * by sort_order. Used by both the admin editor (to render current
     * state) and the user wizard (to render selectable chips).
     *
     * @return Collection<int, PersonalizeOptionGroup>
     */
    public function groupsForTask(string $taskType): Collection
    {
        return PersonalizeOptionGroup::query()
            ->forTask($taskType)
            ->active()
            ->with(['options' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Map of group key → default option value, suitable for the wizard's
     * initial selection state.
     *
     * @return array<string, string>
     */
    public function defaultsForTask(string $taskType): array
    {
        $defaults = [];
        foreach ($this->groupsForTask($taskType) as $group) {
            $default = $group->options->firstWhere('is_default', true)
                ?? $group->options->first();
            if ($default) {
                $defaults[$group->key] = $default->value;
            }
        }

        return $defaults;
    }

    /**
     * Replace all groups and options for a task type with the payload
     * received from the admin editor. Wrapped in a transaction so
     * partial updates never end up half-applied. Enforces single-
     * default-per-group invariant server-side.
     *
     * Payload shape (matches the React component's data model):
     *   [
     *     [
     *       'id' => 'tone',
     *       'label' => 'Tone',
     *       'description' => '...',
     *       'options' => [
     *         ['id' => 'casual', 'value' => 'Casual', 'is_default' => true],
     *         ...
     *       ],
     *     ],
     *     ...
     *   ]
     *
     * @param  array<int, array<string, mixed>>  $payload
     */
    public function replaceGroupsForTask(string $taskType, array $payload): void
    {
        DB::transaction(function () use ($taskType, $payload) {
            $keptGroupIds = [];

            foreach ($payload as $groupIndex => $groupData) {
                $groupKey = $this->slugify((string) ($groupData['id'] ?? $groupData['label'] ?? ''));
                if ($groupKey === '') {
                    continue;
                }

                $group = PersonalizeOptionGroup::updateOrCreate(
                    ['task_type' => $taskType, 'key' => $groupKey],
                    [
                        'label' => (string) ($groupData['label'] ?? $groupKey),
                        'description' => $groupData['description'] ?? null,
                        'sort_order' => $groupIndex,
                        'is_active' => true,
                    ],
                );
                $keptGroupIds[] = $group->id;

                $this->replaceOptionsForGroup($group, $groupData['options'] ?? []);
            }

            PersonalizeOptionGroup::query()
                ->where('task_type', $taskType)
                ->whereNotIn('id', $keptGroupIds)
                ->delete();
        });
    }

    /**
     * Sanitize a user-submitted preferences payload against the
     * admin-defined catalogue for the task. Unknown group keys are
     * dropped. Unknown option values are dropped (rather than rejected)
     * so a stale wizard tab doesn't crash a generation.
     *
     * @param  array<string, mixed>  $preferences
     * @return array<string, string>
     */
    public function validateOptionValues(string $taskType, array $preferences): array
    {
        $groups = $this->groupsForTask($taskType);
        $catalogue = [];
        foreach ($groups as $group) {
            $catalogue[$group->key] = $group->options->pluck('value')->all();
        }

        $clean = [];
        foreach ($preferences as $groupKey => $value) {
            if (!is_string($value) || !isset($catalogue[$groupKey])) {
                continue;
            }
            if (in_array($value, $catalogue[$groupKey], true)) {
                $clean[$groupKey] = $value;
            }
        }

        return $clean;
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     */
    private function replaceOptionsForGroup(PersonalizeOptionGroup $group, array $options): void
    {
        $keptOptionIds = [];
        $defaultsSeen = 0;

        foreach ($options as $optionIndex => $optionData) {
            $value = trim((string) ($optionData['value'] ?? ''));
            if ($value === '') {
                continue;
            }

            $key = $this->slugify((string) ($optionData['id'] ?? $value));
            $isDefault = (bool) ($optionData['is_default'] ?? false);

            // Server-side invariant: only one default per group wins.
            // Each option's is_default is explicitly written below
            // (true for the first match, false for everything else),
            // so no follow-up cleanup query is needed.
            if ($isDefault) {
                $defaultsSeen++;
                if ($defaultsSeen > 1) {
                    $isDefault = false;
                }
            }

            $option = PersonalizeOption::updateOrCreate(
                [
                    'personalize_option_group_id' => $group->id,
                    'key' => $key,
                ],
                [
                    'value' => $value,
                    'is_default' => $isDefault,
                    'sort_order' => $optionIndex,
                    'is_active' => true,
                ],
            );
            $keptOptionIds[] = $option->id;
        }

        PersonalizeOption::query()
            ->where('personalize_option_group_id', $group->id)
            ->whereNotIn('id', $keptOptionIds)
            ->delete();
    }

    private function slugify(string $value): string
    {
        $slug = Str::slug($value, '_');

        return $slug !== '' ? $slug : 'item_' . substr(md5($value), 0, 6);
    }
}

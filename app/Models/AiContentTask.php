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

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Catalog of generation tasks the admin can configure
 * (e.g. course_outline, quick_learn, content_summary).
 *
 * Tasks are seeded by migration and not currently mutable from the
 * UI — adding a new task means adding a new agent call-site that
 * passes the task key into {@see \App\Services\Ai\AiService::prompt()}.
 * The admin only
 * manages the (provider, model) assignments paired with each row.
 */
#[Fillable([
    'key',
    'label',
    'description',
    'is_internal',
    'sort_order',
    'personalize_enabled',
    'resources_enabled',
    'resources_max_files',
    'resources_max_file_size_mb',
])]
class AiContentTask extends Model
{
    /**
     * Per-task admin-tunable runtime knobs and which task keys they
     * apply to. `*` means "every task" (subject to extra rules in
     * {@see self::isConfigKeyApplicable()} — e.g. personalize is
     * still gated to tasks that ship a Personalize step).
     *
     * Extending: add a column on `ai_content_tasks`, list its key
     * here with `applies_to`, and the controller + admin UI pick
     * it up automatically.
     *
     * @var array<string, array{type: string, applies_to: '*'|array<int, string>}>
     */
    public const APPLICABLE_CONFIG = [
        'personalize_enabled' => ['type' => 'bool', 'applies_to' => '*'],
        'resources_enabled' => ['type' => 'bool', 'applies_to' => ['course_outline']],
        'resources_max_files' => ['type' => 'int', 'applies_to' => ['course_outline']],
        'resources_max_file_size_mb' => ['type' => 'int', 'applies_to' => ['course_outline']],
    ];

    protected function casts(): array
    {
        return [
            'is_internal' => 'boolean',
            'sort_order' => 'integer',
            'personalize_enabled' => 'boolean',
            'resources_enabled' => 'boolean',
            'resources_max_files' => 'integer',
            'resources_max_file_size_mb' => 'integer',
        ];
    }

    /** @return HasMany<AiContentTaskAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(AiContentTaskAssignment::class)->orderBy('sort_order');
    }

    /**
     * The single assignment flagged as default — what the runtime
     * resolver picks when no per-user override is supplied.
     *
     * @return HasOne<AiContentTaskAssignment, $this>
     */
    public function defaultAssignment(): HasOne
    {
        return $this->hasOne(AiContentTaskAssignment::class)->where('is_default', true);
    }

    /** @param Builder<static> $query */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Resolve a task row by its string key (the same identifier that
     * gets passed into {@see \App\Services\Ai\AiService::prompt} at
     * call-sites). Returns null
     * for unknown keys so callers can decide whether to throw or fall
     * back.
     */
    public static function findByKey(string $key): ?self
    {
        return static::query()->where('key', $key)->first();
    }

    /**
     * Front-end-shaped picker payload for a task's assignments.
     *
     * Returns one row per assignment — just the bits a dropdown needs
     * (id, model name, default flag, paid-only flag). Provider is
     * deliberately omitted: admins decide what the user sees, the
     * provider is implementation detail. Ordered so the default lands
     * first, then by `sort_order`. Empty array when the task has no
     * assignments or doesn't exist.
     *
     * Lifted here so all three wizard controllers (Quick Learn,
     * Course outline, Quiz) build the picker the exact same way.
     *
     * @return array<int, array{id:int, name:string, is_default:bool, is_paid_only:bool}>
     */
    public static function pickerOptions(string $taskKey): array
    {
        $task = static::findByKey($taskKey);
        if ($task === null) {
            return [];
        }

        return $task->assignments()
            ->with(['model:id,name'])
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->get()
            ->filter(fn ($a) => $a->model !== null)
            ->map(fn ($a) => [
                'id' => (int) $a->id,
                'name' => (string) $a->model->name,
                'is_default' => (bool) $a->is_default,
                'is_paid_only' => (bool) $a->is_paid_only,
            ])
            ->values()
            ->all();
    }

    /**
     * True when the task supports more than one assignment — i.e. it
     * is user-facing AND not the reserved `default` fallback slot.
     * Internal tasks and the default fallback are deliberately locked
     * to a single (provider, model) configuration.
     */
    public function allowsMultipleAssignments(): bool
    {
        return ! $this->is_internal && $this->key !== 'default';
    }

    /**
     * Decide whether a given config key is meaningful for this task.
     *
     * The base rule is the `applies_to` list in APPLICABLE_CONFIG.
     * Some keys add a secondary rule (e.g. personalize toggles only
     * appear on tasks that ship an actual Personalize step) — those
     * extra checks live here so the model is the one source of truth.
     *
     * @param  array<int, string>  $personalizeTasks  task keys that have a Personalize step today
     */
    public function isConfigKeyApplicable(string $key, array $personalizeTasks = []): bool
    {
        $meta = self::APPLICABLE_CONFIG[$key] ?? null;
        if ($meta === null) {
            return false;
        }

        $appliesTo = $meta['applies_to'];
        if (is_array($appliesTo) && ! in_array($this->key, $appliesTo, true)) {
            return false;
        }

        if ($key === 'personalize_enabled') {
            return in_array($this->key, $personalizeTasks, true);
        }

        return true;
    }

    /**
     * Subset of APPLICABLE_CONFIG keys that this task should expose
     * in the admin Configuration tab.
     *
     * @param  array<int, string>  $personalizeTasks
     * @return array<int, string>
     */
    public function applicableConfigKeys(array $personalizeTasks = []): array
    {
        $keys = [];
        foreach (array_keys(self::APPLICABLE_CONFIG) as $key) {
            if ($this->isConfigKeyApplicable($key, $personalizeTasks)) {
                $keys[] = $key;
            }
        }

        return $keys;
    }
}

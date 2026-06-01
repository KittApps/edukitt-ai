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

namespace App\Http\Requests\Admin\Settings;

use App\Models\AiContentTask;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Per-task configuration payload (Configuration sub-tab on the task
 * editor). Every field is optional at the request level — the
 * controller filters submitted keys against
 * AiContentTask::applicableConfigKeys() before writing, so a stale
 * client can't smuggle a key into the wrong task.
 */
class SaveTaskConfigurationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'personalize_enabled' => ['sometimes', 'boolean'],
            'resources_enabled' => ['sometimes', 'boolean'],
            'resources_max_files' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'resources_max_file_size_mb' => ['sometimes', 'integer', 'min:1', 'max:200'],
        ];
    }

    /**
     * Reduce the validated payload to the keys that are actually
     * meaningful for the resolved task — defence in depth on top of
     * the per-key 'sometimes' rule above.
     *
     * @param  array<int, string>  $personalizeTasks
     * @return array<string, mixed>
     */
    public function applicableData(AiContentTask $task, array $personalizeTasks = []): array
    {
        $applicable = array_flip($task->applicableConfigKeys($personalizeTasks));

        return array_intersect_key($this->validated(), $applicable);
    }
}

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
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Bulk-replace the (provider, model) assignments for a single task.
 *
 * The controller resolves the {task} key into an AiContentTask
 * instance before calling validated(); business rules that depend
 * on the task row (e.g. "internal tasks max one row") are enforced
 * here via withValidator() so the controller stays thin.
 */
class SaveTaskAssignmentsRequest extends FormRequest
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
            'assignments' => ['present', 'array'],
            'assignments.*.id' => ['nullable', 'integer'],
            'assignments.*.ai_provider_id' => ['required', 'integer', 'exists:ai_providers,id'],
            'assignments.*.ai_provider_model_id' => ['required', 'integer', 'exists:ai_provider_models,id'],
            'assignments.*.temperature' => ['nullable', 'numeric', 'min:0', 'max:2'],
            'assignments.*.max_tokens' => ['nullable', 'integer', 'min:100', 'max:128000'],
            'assignments.*.is_default' => ['nullable', 'boolean'],
            'assignments.*.is_paid_only' => ['nullable', 'boolean'],
            'assignments.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            /** @var AiContentTask|null $task */
            $task = $this->route('task');
            if (! $task instanceof AiContentTask) {
                return;
            }

            $assignments = $this->input('assignments', []);
            if (! is_array($assignments)) {
                return;
            }

            if (! $task->allowsMultipleAssignments() && count($assignments) > 1) {
                $v->errors()->add(
                    'assignments',
                    'This task only supports a single AI provider/model.',
                );
            }

            // Exactly one assignment must be marked default. The
            // default flag is silently coerced for single-row tasks
            // so the admin UI doesn't have to render the radio for
            // them, but multi-row tasks must explicitly pick one.
            $defaults = array_filter(
                $assignments,
                fn ($a) => ! empty($a['is_default']),
            );
            if (count($assignments) > 0 && count($defaults) !== 1) {
                $v->errors()->add(
                    'assignments',
                    'Exactly one assignment must be marked as default.',
                );
            }

            // No duplicate (provider, model) pairs within the task —
            // also enforced by the DB unique index, but reporting it
            // here gives the admin a clean validation message.
            $seen = [];
            foreach ($assignments as $i => $a) {
                $key = ($a['ai_provider_id'] ?? '').':'.($a['ai_provider_model_id'] ?? '');
                if (isset($seen[$key])) {
                    $v->errors()->add(
                        "assignments.$i.ai_provider_model_id",
                        'This provider/model pair is already assigned to this task.',
                    );
                }
                $seen[$key] = true;
            }
        });
    }
}

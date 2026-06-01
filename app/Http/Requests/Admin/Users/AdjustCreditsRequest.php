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

namespace App\Http\Requests\Admin\Users;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Credits-pane payload. Either `add` or `remove` (or both) must be
 * positive; the controller applies the delta inside a transaction
 * with a row-level lock on `user_credit_balances`. `note` is an
 * optional free-text reason kept on the flash so the admin sees
 * what they just did.
 */
class AdjustCreditsRequest extends FormRequest
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
            'add' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'remove' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:500'],
            'at_least_one' => [$this->requireNonZeroDelta()],
        ];
    }

    /**
     * Synthetic "field" so we can attach a top-level validation error
     * that doesn't belong to `add` or `remove` individually. The form
     * surfaces this as a banner above the inputs.
     */
    private function requireNonZeroDelta(): ValidationRule
    {
        return new class implements ValidationRule
        {
            public function validate(
                string $attribute,
                mixed $value,
                Closure $fail,
            ): void {
                $add = (int) (request()->input('add') ?? 0);
                $remove = (int) (request()->input('remove') ?? 0);

                if ($add === 0 && $remove === 0) {
                    $fail('Enter a non-zero amount to add or remove.');
                }
            }
        };
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'at_least_one' => true,
        ]);
    }
}

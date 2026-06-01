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

use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Combined Basics + Subscription pane payload. Password is *not*
 * accepted here — the admin uses the dedicated SetPasswordRequest
 * action so a no-op Save on Basics never resets credentials.
 *
 * `email_verified` is the boolean from the toggle; the controller
 * translates it into a write/clear on `email_verified_at`.
 *
 * `period_starts_at` / `period_ends_at` let the admin manually
 * extend (or backdate) the user's credit period. Both are optional;
 * when blank the existing window is kept.
 */
class UpdateUserRequest extends FormRequest
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
        /** @var User|null $user */
        $user = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class, 'email')->ignore($user?->id),
            ],
            'is_admin' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'email_verified' => ['required', 'boolean'],
            'subscription_plan_id' => [
                'nullable',
                Rule::exists(SubscriptionPlan::class, 'id'),
            ],
            'period_starts_at' => ['nullable', 'date'],
            'period_ends_at' => ['nullable', 'date', 'after:period_starts_at'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_admin' => $this->boolean('is_admin'),
            'is_active' => $this->boolean('is_active'),
            'email_verified' => $this->boolean('email_verified'),
        ]);
    }
}

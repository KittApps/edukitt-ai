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
use Illuminate\Validation\Rules\Password;

/**
 * Admin-side user-create payload. The admin can pick a starting
 * subscription plan and decide whether the new account is admin or
 * regular. `email_verified` defaults to true because admin-created
 * accounts are typically internal users that don't need to verify.
 */
class StoreUserRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class, 'email'),
            ],
            'password' => ['required', 'confirmed', Password::min(8)],
            'is_admin' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'email_verified' => ['required', 'boolean'],
            'subscription_plan_id' => [
                'nullable',
                Rule::exists(SubscriptionPlan::class, 'id'),
            ],
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

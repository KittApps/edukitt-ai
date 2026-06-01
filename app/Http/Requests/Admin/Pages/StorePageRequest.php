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

namespace App\Http\Requests\Admin\Pages;

use App\Models\Page;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        $page = $this->route('page');
        $id = $page instanceof Page ? $page->id : null;

        return [
            'title' => ['required', 'string', 'max:200'],
            'slug' => [
                'required',
                'string',
                'max:120',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('pages', 'slug')->ignore($id),
            ],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string', 'max:200000'],
            'is_published' => ['required', 'boolean'],
            'show_in_footer' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'Slug must be lowercase letters, numbers and dashes only.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $page = $this->route('page');
        // Editing a system page locks the slug — restore the original value so
        // a tampered payload cannot change it.
        if ($page instanceof Page && $page->is_system) {
            $this->merge(['slug' => $page->slug]);
        }
    }
}

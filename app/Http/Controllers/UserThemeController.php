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

namespace App\Http\Controllers;

use App\Models\Theme;
use App\Services\Settings\ThemeSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Lets an authenticated user pick their preferred app-side theme,
 * mirroring the existing /locale switcher in shape and policy:
 *
 *   - 401 / redirect when not authenticated.
 *   - 403 when the admin has disabled user-selectable themes.
 *   - 422 when the requested theme does not exist or is disabled.
 *
 * The chosen key is persisted on `users.theme` and surfaces back through
 * Inertia's shared props on the next request, so the layout repaints
 * with the new CSS theme class.
 */
class UserThemeController extends Controller
{
    public function __construct(private readonly ThemeSettings $settings) {}

    public function switch(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_if($user === null, 401);

        abort_unless(
            $this->settings->isUserSelectionEnabled(),
            403,
            'Theme selection is disabled for users.',
        );

        $data = $request->validate([
            'key' => 'required|string',
        ]);

        $theme = Theme::query()->where('key', $data['key'])->first();
        if ($theme === null || ! $theme->enabled) {
            return back()->withErrors([
                'key' => 'That theme is not available.',
            ]);
        }

        $user->forceFill(['theme' => $theme->key])->save();

        return back();
    }
}

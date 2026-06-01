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

use App\Models\Language;
use App\Services\LocalizationService;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    public function switch(Request $request, LocalizationService $service)
    {
        $data = $request->validate([
            'code' => 'required|string|max:10',
        ]);

        $language = Language::where('code', $data['code'])
            ->where('is_active', true)
            ->first();

        if ($language) {
            $service->setCurrentCode($language->code);
            app()->setLocale($language->code);

            // Persist the choice on the user record so it survives
            // logout, future logins from other devices
            $user = $request->user();
            if ($user !== null && $user->locale !== $language->code) {
                $user->forceFill(['locale' => $language->code])->saveQuietly();
            }
        }

        return redirect()->back();
    }
}

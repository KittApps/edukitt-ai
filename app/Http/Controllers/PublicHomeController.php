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

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public marketing home page at "/".
 *
 * Renders the Inertia "Public/Home" page for unauthenticated visitors,
 * and transparently redirects signed-in users to their dashboard so the
 * landing surface stays focused on conversion.
 */
class PublicHomeController extends Controller
{
    public function index(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        if ($request->user() !== null) {
            return redirect($request->user()->postAuthenticationRedirectUrl());
        }

        return Inertia::render('Public/Home');
    }
}

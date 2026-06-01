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

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Force-log-out users whose `is_active` flag has been flipped off by
 * an admin while they had a live session.
 *
 * Login itself is already blocked by LoginRequest::authenticate(), so
 * this middleware exists for the in-flight case: an admin disables an
 * account in the Users pane, and the very next request from that user
 * (Inertia visit, AJAX call, plain GET) is intercepted, the session
 * is invalidated, and they're bounced to /login with an error.
 *
 * Registered globally on the web group; no-ops for guests.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->isActive()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $message = t(
                'auth.account_deactivated',
                'Your account has been deactivated. Please contact an administrator.',
            );

            // Inertia / XHR callers need a 409 + JSON to surface the
            // message in the SPA shell instead of a hard redirect that
            // would just dump them on the login page mid-flow.
            if ($request->header('X-Inertia') || $request->expectsJson()) {
                return response()->json([
                    'message' => $message,
                ], 401);
            }

            return redirect()
                ->route('login')
                ->withErrors(['email' => $message]);
        }

        return $next($request);
    }
}

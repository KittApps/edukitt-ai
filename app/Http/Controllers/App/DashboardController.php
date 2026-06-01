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

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        // "Continue Learning" = active courses the user can still make
        // progress on, ordered by most recent visit. `whereHas` against
        // `modules.lessons` keeps the query a single subquery (no N+1) and
        // mirrors how completion is tracked: a lesson is complete when its
        // `completed_at` is set, so a course is in-progress iff it has at
        // least one lesson with `completed_at IS NULL`. `COALESCE` falls
        // back to `updated_at` for courses that pre-date `last_accessed_at`
        // or haven't been opened since the column was added.
        $recentCourses = $user->courses()
            ->where('status', 'active')
            ->whereHas('modules.lessons', function ($query) {
                $query->whereNull('completed_at');
            })
            ->withCount(['modules'])
            ->orderByRaw('COALESCE(last_accessed_at, updated_at) DESC')
            ->limit(2)
            ->get();

        $recentQuickLearns = $user->quickLearns()
            ->where('status', 'active')
            ->latest()
            ->limit(6)
            ->get();

        $stats = [
            'courses_count' => $user->courses()->count(),
            'quick_learns_count' => $user->quickLearns()->count(),
            'quizzes_count' => $user->quizzes()->count(),
            'certificates_count' => $user->certificates()->whereNull('revoked_at')->count(),
        ];

        return Inertia::render('App/Dashboard', [
            'recentCourses' => $recentCourses,
            'recentQuickLearns' => $recentQuickLearns,
            'stats' => $stats,
        ]);
    }
}

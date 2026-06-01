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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Header live-search endpoint.
 *
 * Returns a small JSON payload of matching courses, quick learns and
 * quizzes for the current user. Intentionally lightweight: a per-type
 * cap of 5 and a hard total cap of 15 keeps the response sub-50KB even
 * for very busy accounts, and lets the dropdown stay snappy without
 * needing pagination.
 *
 * The full library page is the source of truth for browsing — this
 * endpoint exists only to power the header dropdown and "press Enter
 * → open in library" flow.
 */
class SearchController extends Controller
{
    private const PER_TYPE_LIMIT = 5;

    private const TOTAL_LIMIT = 15;

    public function __invoke(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));
        $user = $request->user();

        if ($term === '' || mb_strlen($term) < 2 || $user === null) {
            return response()->json([
                'query' => $term,
                'results' => [],
            ]);
        }

        $like = '%'.$this->escapeForLike($term).'%';

        $courses = $user->courses()
            ->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like);
            })
            ->latest()
            ->limit(self::PER_TYPE_LIMIT)
            ->get(['id', 'title', 'description'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'type' => 'course',
                'title' => $c->title,
                'description' => $c->description,
                'url' => "/app/courses/{$c->id}",
            ]);

        $quickLearns = $user->quickLearns()
            ->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like);
            })
            ->latest()
            ->limit(self::PER_TYPE_LIMIT)
            ->get(['id', 'title', 'description'])
            ->map(fn ($q) => [
                'id' => $q->id,
                'type' => 'quick-learn',
                'title' => $q->title,
                'description' => $q->description,
                'url' => "/app/quick-learns/{$q->id}",
            ]);

        $quizzes = $user->quizzes()
            ->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like);
            })
            ->latest()
            ->limit(self::PER_TYPE_LIMIT)
            ->get(['id', 'title', 'description'])
            ->map(fn ($q) => [
                'id' => $q->id,
                'type' => 'quiz',
                'title' => $q->title,
                'description' => $q->description,
                'url' => "/app/quizzes/{$q->id}",
            ]);

        $results = $courses
            ->concat($quickLearns)
            ->concat($quizzes)
            ->take(self::TOTAL_LIMIT)
            ->values();

        return response()->json([
            'query' => $term,
            'results' => $results,
            'counts' => [
                'courses' => $courses->count(),
                'quick_learns' => $quickLearns->count(),
                'quizzes' => $quizzes->count(),
                'total' => $this->totalCount($courses, $quickLearns, $quizzes),
            ],
        ]);
    }

    /**
     * Escape LIKE-significant chars so a user typing "100%" doesn't
     * match every record. Backslash is the default LIKE escape on
     * MySQL/MariaDB and is also accepted by Postgres / SQLite when
     * we use the default behaviour.
     */
    private function escapeForLike(string $term): string
    {
        return addcslashes($term, '\\%_');
    }

    private function totalCount(Collection ...$buckets): int
    {
        return array_sum(array_map(fn (Collection $c) => $c->count(), $buckets));
    }
}

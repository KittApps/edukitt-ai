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
use App\Models\User;
use App\Services\Ai\AiContentGlobalConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Library page + the JSON endpoint that powers its "Load more" button.
 *
 * Pagination strategy
 * -------------------
 * The library mixes three content types (courses, quick learns, quizzes)
 * which live in three separate tables. Two cases:
 *
 *   - `filter ∈ {courses, quick_learns, quizzes}` → a plain offset
 *     paginate against that one table.
 *
 *   - `filter = all`                              → fetch the top
 *     `page * PER_PAGE` rows from each table, merge, sort by
 *     created_at desc, then slice the requested page window. This is
 *     `O(page * PER_PAGE)` per request which is fine for personal
 *     libraries (typically O(100s) of items, ever); if a single user
 *     ever ends up with O(10k) items we'd want a UNION / cursor.
 *
 * Search is applied server-side on `title` + `description` with proper
 * LIKE escaping (matching the header SearchController), so typing
 * "100%" doesn't match every row.
 */
class LibraryController extends Controller
{
    private const PER_PAGE = 12;

    private const FILTERS = ['all', 'courses', 'quick_learns', 'quizzes'];

    public function __construct(
        protected AiContentGlobalConfig $globalConfig,
    ) {}

    /**
     * Initial page render. Sends the first page of items plus the
     * stats block so the page can paint without an extra round-trip.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $payload = $this->loadPage($user, $request, 1);

        $snapshot = $this->globalConfig->snapshot();

        return Inertia::render('App/Library', [
            'initialItems' => $payload['items'],
            'initialHasMore' => $payload['has_more'],
            'initialFilter' => $payload['filter'],
            'initialSearch' => $payload['q'],
            'perPage' => self::PER_PAGE,
            'stats' => $this->stats($user),
            'showAiModel' => (bool) $snapshot[AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL],
        ]);
    }

    /**
     * JSON endpoint used by "Load more" and by filter / search changes.
     * Returns the same shape as `loadPage()`.
     */
    public function items(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', '1'));
        $payload = $this->loadPage($request->user(), $request, $page);

        return response()->json($payload);
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, page: int, has_more: bool, filter: string, q: string}
     */
    private function loadPage(User $user, Request $request, int $page): array
    {
        $filter = $request->query('filter', 'all');
        if (! in_array($filter, self::FILTERS, true)) {
            $filter = 'all';
        }

        $q = trim((string) $request->query('q', ''));

        $bundle = match ($filter) {
            'courses' => $this->pageOf($this->coursesQuery($user, $q), $page, fn ($row) => $this->formatCourse($row)),
            'quick_learns' => $this->pageOf($this->quickLearnsQuery($user, $q), $page, fn ($row) => $this->formatQuickLearn($row)),
            'quizzes' => $this->pageOf($this->quizzesQuery($user, $q), $page, fn ($row) => $this->formatQuiz($row)),
            default => $this->mergedPage($user, $q, $page),
        };

        $items = array_map(fn ($item) => $this->stripSortKey($item), $bundle['items']);

        return [
            'items' => $items,
            'page' => $page,
            'has_more' => $bundle['has_more'],
            'filter' => $filter,
            'q' => $q,
        ];
    }

    /**
     * Single-table page using offset pagination. Fetches PER_PAGE + 1
     * rows to detect whether another page exists without a separate
     * COUNT(*) call.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<*>  $query
     * @return array{items: array<int, array<string, mixed>>, has_more: bool}
     */
    private function pageOf($query, int $page, callable $formatter): array
    {
        $offset = ($page - 1) * self::PER_PAGE;

        $rows = $query
            ->latest()
            ->skip($offset)
            ->take(self::PER_PAGE + 1)
            ->get();

        $hasMore = $rows->count() > self::PER_PAGE;
        $page = $rows->take(self::PER_PAGE)->map($formatter)->values();

        return [
            'items' => $page->all(),
            'has_more' => $hasMore,
        ];
    }

    /**
     * Cross-type "All" page. See class docblock for the trade-off.
     *
     * @return array{items: array<int, array<string, mixed>>, has_more: bool}
     */
    private function mergedPage(User $user, string $q, int $page): array
    {
        $cap = $page * self::PER_PAGE;
        $probe = $cap + 1;

        $courses = $this->coursesQuery($user, $q)
            ->latest()
            ->take($probe)
            ->get()
            ->map(fn ($row) => $this->formatCourse($row));

        $quickLearns = $this->quickLearnsQuery($user, $q)
            ->latest()
            ->take($probe)
            ->get()
            ->map(fn ($row) => $this->formatQuickLearn($row));

        $quizzes = $this->quizzesQuery($user, $q)
            ->latest()
            ->take($probe)
            ->get()
            ->map(fn ($row) => $this->formatQuiz($row));

        $merged = $courses
            ->concat($quickLearns)
            ->concat($quizzes)
            ->sortByDesc(fn ($item) => $item['created_at_ts'])
            ->values();

        $hasMore = $merged->count() > $cap;
        $window = $merged
            ->take($cap)
            ->slice(($page - 1) * self::PER_PAGE)
            ->values();

        return [
            'items' => $window->all(),
            'has_more' => $hasMore,
        ];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<\App\Models\Course>
     */
    private function coursesQuery(User $user, string $q)
    {
        return $user->courses()
            ->withCount(['modules', 'lessons'])
            ->withCount([
                'lessons as completed_lessons_count' => fn ($builder) => $builder->where('is_generated', true),
            ])
            ->when($q !== '', fn ($b) => $b->where(function ($w) use ($q) {
                $like = '%'.$this->escapeForLike($q).'%';
                $w->where('title', 'like', $like)->orWhere('description', 'like', $like);
            }));
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<\App\Models\QuickLearn>
     */
    private function quickLearnsQuery(User $user, string $q)
    {
        return $user->quickLearns()
            ->when($q !== '', fn ($b) => $b->where(function ($w) use ($q) {
                $like = '%'.$this->escapeForLike($q).'%';
                $w->where('title', 'like', $like)->orWhere('description', 'like', $like);
            }));
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<\App\Models\Quiz>
     */
    private function quizzesQuery(User $user, string $q)
    {
        return $user->quizzes()
            ->withCount(['attempts as attempts_count' => fn ($builder) => $builder->whereNotNull('completed_at')])
            ->when($q !== '', fn ($b) => $b->where(function ($w) use ($q) {
                $like = '%'.$this->escapeForLike($q).'%';
                $w->where('title', 'like', $like)->orWhere('description', 'like', $like);
            }));
    }

    /**
     * @return array<string, mixed>
     */
    private function formatCourse($course): array
    {
        $progress = ($course->lessons_count ?? 0) > 0
            ? (int) round(($course->completed_lessons_count / $course->lessons_count) * 100)
            : 0;

        return [
            'id' => $course->id,
            'type' => 'course',
            'title' => $course->title,
            'description' => $course->description,
            'status' => $course->status,
            'progress' => $progress,
            'modules_count' => $course->modules_count ?? 0,
            'lessons_count' => $course->lessons_count ?? 0,
            'ai_model_name' => $course->ai_model_name,
            'created_at' => $course->created_at?->diffForHumans(),
            'created_at_ts' => $course->created_at?->timestamp ?? 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatQuickLearn($ql): array
    {
        return [
            'id' => $ql->id,
            'type' => 'quick-learn',
            'title' => $ql->title,
            'description' => $ql->description,
            'status' => $ql->status,
            'ai_model_name' => $ql->ai_model_name,
            'created_at' => $ql->created_at?->diffForHumans(),
            'created_at_ts' => $ql->created_at?->timestamp ?? 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatQuiz($quiz): array
    {
        $preferences = $quiz->preferences ?? [];

        return [
            'id' => $quiz->id,
            'type' => 'quiz',
            'title' => $quiz->title,
            'description' => $quiz->description,
            'status' => $quiz->status,
            'question_count' => $quiz->question_count,
            'difficulty' => $preferences['difficulty'] ?? null,
            'ai_model_name' => $quiz->ai_model_name,
            'attempts_count' => $quiz->attempts_count ?? 0,
            'created_at' => $quiz->created_at?->diffForHumans(),
            'created_at_ts' => $quiz->created_at?->timestamp ?? 0,
        ];
    }

    /**
     * Header counts shown above the grid. Computed once per page load
     * (not per "Load more"), since these don't move while paginating.
     *
     * @return array{courses: int, quick_learns: int, quizzes: int, completed: int}
     */
    private function stats(User $user): array
    {
        return [
            'courses' => $user->courses()->count(),
            'quick_learns' => $user->quickLearns()->count(),
            'quizzes' => $user->quizzes()->count(),
            'completed' => $user->courses()->where('status', 'completed')->count(),
        ];
    }

    /**
     * `created_at_ts` is used only as the sort key for the merged view;
     * strip it from the rows we hand back to the frontend.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function stripSortKey(array $item): array
    {
        unset($item['created_at_ts']);

        return $item;
    }

    private function escapeForLike(string $term): string
    {
        return addcslashes($term, '\\%_');
    }
}

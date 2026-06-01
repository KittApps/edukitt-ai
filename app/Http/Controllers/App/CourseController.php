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

use App\Exceptions\Ai\NoAvailableModelException;
use App\Http\Controllers\App\Concerns\ResolvesAiSelections;
use App\Http\Controllers\Controller;
use App\Models\AiContentTask;
use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Services\Ai\AiContentGlobalConfig;
use App\Services\Ai\Generation\AiGenerationDispatcher;
use App\Services\Ai\TaskAssignmentResolver;
use App\Services\CourseCertificateService;
use App\Services\PersonalizeOptionsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CourseController extends Controller
{
    use ResolvesAiSelections;

    public function __construct(
        protected AiGenerationDispatcher $generationDispatcher,
        protected PersonalizeOptionsService $personalize,
        protected CourseCertificateService $certificates,
        protected AiContentGlobalConfig $globalConfig,
        protected TaskAssignmentResolver $assignmentResolver,
    ) {}

    public function index(Request $request)
    {
        $courses = $request->user()->courses()
            ->withCount('modules')
            ->latest()
            ->paginate(12);

        return Inertia::render('App/Library', [
            'courses' => $courses,
        ]);
    }

    public function create(Request $request)
    {
        /** @var User|null $user */
        $user = $request->user();
        $isPaidUser = $this->isPaidUser($user);

        $snapshot = $this->globalConfig->snapshot();
        $userCanSelectModel = (bool) $snapshot[AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL];
        $mergeCourseGeneration = (bool) $snapshot[AiContentGlobalConfig::KEY_MERGE_COURSE_GENERATION];
        $showLanguageSelector = (bool) $snapshot[AiContentGlobalConfig::KEY_SHOW_LANGUAGE_SELECTOR];

        // Per-task admin toggles drive which wizard steps render at all.
        // The Personalize step disappears entirely when the toggle is OFF;
        // the Resources step disappears when uploads are disabled. The
        // front-end derives the visible step list from these flags.
        $task = AiContentTask::findByKey('course_outline');
        $personalizeEnabled = $task?->personalize_enabled ?? true;
        $resourcesEnabled = (bool) ($task?->resources_enabled ?? false);
        $resourcesMaxFiles = (int) ($task?->resources_max_files ?? 5);
        $resourcesMaxFileSizeMb = (int) ($task?->resources_max_file_size_mb ?? 10);

        return Inertia::render('App/Courses/Create', [
            'personalizeGroups' => $personalizeEnabled
                ? $this->personalize->groupsForTask('course_outline')
                    ->map(fn ($group) => [
                        'key' => $group->key,
                        'label' => $group->label,
                        'description' => $group->description,
                        'options' => $group->options->map(fn ($option) => [
                            'key' => $option->key,
                            'value' => $option->value,
                            'is_default' => $option->is_default,
                        ])->values()->all(),
                    ])
                    ->values()
                    ->all()
                : [],
            'personalizeDefaults' => $personalizeEnabled
                ? $this->personalize->defaultsForTask('course_outline')
                : [],
            'personalizeEnabled' => $personalizeEnabled,
            'resourcesConfig' => [
                'enabled' => $resourcesEnabled,
                'max_files' => $resourcesMaxFiles,
                'max_file_size_mb' => $resourcesMaxFileSizeMb,
            ],
            'availableModels' => AiContentTask::pickerOptions('course_outline'),
            'supportedLanguages' => $snapshot[AiContentGlobalConfig::KEY_SUPPORTED_LANGUAGES],
            'globalConfig' => [
                'user_can_select_model' => $userCanSelectModel,
                'merge_course_generation' => $mergeCourseGeneration,
                'show_language_selector' => $showLanguageSelector,
            ],
            'isPaidUser' => $isPaidUser,
        ]);
    }

    public function generateOutline(Request $request)
    {
        // Load the per-task admin config FIRST so the validation rules
        // can quote the same numbers the wizard's hint shows. Doing it
        // before validate() means a stale tab over-uploading is
        // rejected with the current admin limits, not last-deploy's.
        $task = AiContentTask::findByKey('course_outline');
        $personalizeEnabled = $task?->personalize_enabled ?? true;
        $resourcesEnabled = (bool) ($task?->resources_enabled ?? false);
        $resourcesMaxFiles = max(1, (int) ($task?->resources_max_files ?? 5));
        $resourcesMaxFileSizeKb = max(1, (int) ($task?->resources_max_file_size_mb ?? 10)) * 1024;

        $request->validate([
            'topic' => 'required|string|max:500',
            'preferences' => 'nullable|array',
            // File limits read straight from the admin config. The
            // wizard mirrors these in its hint + client-side caps;
            // this rule is the authoritative gate.
            'resources' => "nullable|array|max:{$resourcesMaxFiles}",
            'resources.*' => "file|max:{$resourcesMaxFileSizeKb}",
            'regenerate_instructions' => 'nullable|string|max:1000',
            // Optional client-side picks from the language / model
            // selectors. The resolver vets the assignment_id (task,
            // plan, global toggle); resolveLanguageName() vets the
            // language. Invalid values silently fall back to defaults.
            'assignment_id' => 'nullable|integer',
            'language' => 'nullable|string|max:64',
        ]);

        /** @var User $user */
        $user = $request->user();
        $topic = $request->input('topic');

        // A stale wizard tab can still ship resources or preferences
        // after the admin disabled them. Drop those inputs server-side
        // rather than handing them to the agent.
        $preferences = $personalizeEnabled
            ? (array) $request->input('preferences', [])
            : [];

        $attachments = [];
        if ($resourcesEnabled && $request->hasFile('resources')) {
            foreach ($request->file('resources') as $file) {
                $attachments[] = $file;
            }
        }

        // Both the summary and outline AI calls run inside the
        // CourseOutlinePersister. Either can hit a missing-model wall
        // and bubble NoAvailableModelException — caught once, surfaced
        // as the standard "AI unavailable" response so a stale tab
        // never sees a half-summarised half-failed mess.
        try {
            $assignment = $this->assignmentResolver->resolveForTask('course_outline', [
                'client_assignment_id' => $request->input('assignment_id'),
                'is_paid_user' => $this->isPaidUser($user),
            ]);

            $languageName = $this->resolveLanguageName($request->input('language'));

            $result = $this->generationDispatcher->dispatch(
                taskKey: 'course_outline',
                userId: $user->id,
                assignment: $assignment,
                language: $languageName,
                input: [
                    'topic' => $topic,
                    'preferences' => $preferences,
                    'regenerate_instructions' => $request->input('regenerate_instructions'),
                ],
                uploadedFiles: $attachments,
            );
        } catch (NoAvailableModelException $e) {
            return $this->noModelResponse($e);
        }

        if ($result->queued) {
            return response()->json([
                'queued' => true,
                'generation_id' => $result->generation->id,
            ], 202);
        }

        $payload = $result->persisted->payload;

        return response()->json([
            // Course-level metadata the schema now produces, so the
            // wizard's Review step can preview the AI-picked title
            // and the user can accept-as-is without typing one.
            'title' => $payload['title'] ?? null,
            'description' => $payload['description'] ?? null,
            'outline' => $payload['outline'],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'topic' => 'required|string',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'preferences' => 'nullable|array',
            'language' => 'nullable|string|max:64',
            'assignment_id' => 'nullable|integer',
            'outline' => 'required|array',
            'outline.*.module' => 'required|string',
            'outline.*.short_desc' => 'required|string',
            'outline.*.lessons' => 'required|array',
        ]);

        $outline = $request->input('outline');
        $topic = $request->input('topic');

        $languageName = $this->resolveLanguageName($request->input('language')) ?? 'English';

        $aiTitle = trim((string) $request->input('title', ''));
        $aiDescription = trim((string) $request->input('description', ''));

        $aiModelName = null;
        try {
            $assignment = $this->assignmentResolver->resolveForTask('course_outline', [
                'client_assignment_id' => $request->input('assignment_id'),
                'is_paid_user' => $this->isPaidUser($request->user()),
            ]);
            $aiModelName = $assignment->model?->name;
        } catch (NoAvailableModelException $e) {
            // Snapshot is best-effort; missing model just leaves the column null.
        }

        $course = Course::create([
            'user_id' => $request->user()->id,
            'title' => $aiTitle !== '' ? $aiTitle : $topic,
            'description' => $aiDescription !== ''
                ? $aiDescription
                : ($outline[0]['short_desc'] ?? ''),
            'topic' => $topic,
            'preferences' => $request->input('preferences'),
            'language' => $languageName,
            'ai_model_name' => $aiModelName,
            'difficulty' => $request->input('preferences.difficulty'),
            'learning_style' => $request->input('preferences.learning_style'),
            'duration' => $request->input('preferences.duration'),
            'status' => 'active',
        ]);

        foreach ($outline as $moduleIndex => $moduleData) {
            $module = Module::create([
                'course_id' => $course->id,
                'title' => $moduleData['module'],
                'description' => $moduleData['short_desc'],
                'sort_order' => $moduleIndex,
            ]);

            foreach ($moduleData['lessons'] as $lessonIndex => $lessonData) {
                Lesson::create([
                    'module_id' => $module->id,
                    'title' => $lessonData['title'],
                    'summary' => $lessonData['summary'],
                    'estimated_duration' => $lessonData['estimated_duration'] ?? null,
                    'sort_order' => $lessonIndex,
                ]);
            }
        }

        return response()->json([
            'course' => $course->load('modules.lessons'),
            'redirect' => route('app.courses.show', $course),
        ]);
    }

    public function show(Course $course)
    {
        $this->authorize('view', $course);

        // Bump the per-course "last visit" stamp powering the dashboard's
        // Continue Learning sort. Done as a direct UPDATE (no model events,
        // no touch of `updated_at`) so unrelated listeners and timestamp
        // consumers don't see a spurious mutation on every page view.
        Course::whereKey($course->id)->update(['last_accessed_at' => now()]);

        $course->load(['modules.lessons', 'modules.courseQuiz.quiz']);

        $snapshot = $this->globalConfig->snapshot();

        return Inertia::render('App/Courses/Show', [
            'course' => $this->presentCourse($course),
            'showAiModel' => (bool) $snapshot[AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL],
            // Power the per-module "Generate Quiz" modal — same admin-managed
            // personalize chips the manual quiz wizard uses.
            'quizPersonalizeGroups' => $this->personalize->groupsForTask('quiz_generate')
                ->map(fn ($group) => [
                    'key' => $group->key,
                    'label' => $group->label,
                    'description' => $group->description,
                    'options' => $group->options->map(fn ($option) => [
                        'key' => $option->key,
                        'value' => $option->value,
                        'is_default' => $option->is_default,
                    ])->values()->all(),
                ])
                ->values()
                ->all(),
            'quizPersonalizeDefaults' => $this->personalize->defaultsForTask('quiz_generate'),
        ]);
    }

    /**
     * Flatten the course aggregate for the Show page. Adds a compact
     * `quiz` field to each module (id + title + question_count + best
     * attempt score) so the page can render the module-quiz card without
     * shipping the full Quiz row. The top-level `certificate` field powers
     * the sidebar Certificate card with the current user-course state.
     */
    private function presentCourse(Course $course): array
    {
        /** @var User|null $user */
        $user = Auth::user();
        $userId = $user?->id;

        $certificateStatus = $user
            ? $this->certificates->status($user, $course)
            : 'in_progress';

        $certificateId = null;
        if ($user && $certificateStatus === 'earned') {
            $certificateId = CourseCertificate::query()
                ->active()
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->value('id');
        }

        return [
            'id' => $course->id,
            'title' => $course->title,
            'description' => $course->description,
            'language' => $course->language,
            'ai_model_name' => $course->ai_model_name,
            'preferences' => $course->preferences ?? [],
            'difficulty' => $course->difficulty,
            'status' => $course->status,
            'progress' => $course->progress ?? 0,
            'created_at' => $course->created_at?->toIso8601String(),
            'certificate' => [
                'status' => $certificateStatus,
                'id' => $certificateId,
            ],
            'modules' => $course->modules->map(function ($module) use ($userId) {
                $quiz = $module->courseQuiz?->quiz;
                $bestScore = null;
                if ($quiz && $userId) {
                    $bestScore = $quiz->attempts()
                        ->where('user_id', $userId)
                        ->whereNotNull('completed_at')
                        ->max('score');
                }

                return [
                    'id' => $module->id,
                    'title' => $module->title,
                    'description' => $module->description,
                    'sort_order' => $module->sort_order,
                    'lessons' => $module->lessons->map(fn ($lesson) => [
                        'id' => $lesson->id,
                        'title' => $lesson->title,
                        'is_generated' => (bool) $lesson->is_generated,
                        'completed_at' => $lesson->completed_at?->toIso8601String(),
                        'sort_order' => $lesson->sort_order,
                        'estimated_duration' => $lesson->estimated_duration,
                    ])->values()->all(),
                    'quiz' => $quiz ? [
                        'id' => $quiz->id,
                        'title' => $quiz->title,
                        'question_count' => (int) $quiz->question_count,
                        'difficulty' => $quiz->preferences['difficulty'] ?? null,
                        'best_score' => $bestScore !== null ? (int) $bestScore : null,
                    ] : null,
                ];
            })->values()->all(),
        ];
    }

    public function destroy(Course $course)
    {
        $this->authorize('delete', $course);
        $course->delete();

        return redirect()->route('app.library')->with('success', 'Course deleted.');
    }

}

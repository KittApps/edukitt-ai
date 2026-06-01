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
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Services\Ai\AiContentGlobalConfig;
use App\Services\Ai\Generation\AiGenerationDispatcher;
use App\Services\Ai\TaskAssignmentResolver;
use App\Services\PersonalizeOptionsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuizController extends Controller
{
    use ResolvesAiSelections;

    public function __construct(
        protected AiGenerationDispatcher $generationDispatcher,
        protected PersonalizeOptionsService $personalize,
        protected AiContentGlobalConfig $globalConfig,
        protected TaskAssignmentResolver $assignmentResolver,
    ) {}

    public function create(Request $request)
    {
        /** @var User|null $user */
        $user = $request->user();
        $isPaidUser = $this->isPaidUser($user);

        $snapshot = $this->globalConfig->snapshot();
        $userCanSelectModel = (bool) $snapshot[AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL];
        $showLanguageSelector = (bool) $snapshot[AiContentGlobalConfig::KEY_SHOW_LANGUAGE_SELECTOR];

        // Per-task admin toggle: when OFF the wizard collapses the
        // Personalize step entirely and the Ready-to-go card moves
        // up to host the Generate button on the Topic step.
        $personalizeEnabled = AiContentTask::findByKey('quiz_generate')?->personalize_enabled ?? true;

        return Inertia::render('App/Quizzes/Create', [
            'personalizeGroups' => $personalizeEnabled
                ? $this->personalize->groupsForTask('quiz_generate')
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
                ? $this->personalize->defaultsForTask('quiz_generate')
                : [],
            'personalizeEnabled' => $personalizeEnabled,
            'availableModels' => AiContentTask::pickerOptions('quiz_generate'),
            'supportedLanguages' => $snapshot[AiContentGlobalConfig::KEY_SUPPORTED_LANGUAGES],
            'globalConfig' => [
                'user_can_select_model' => $userCanSelectModel,
                'show_language_selector' => $showLanguageSelector,
            ],
            'isPaidUser' => $isPaidUser,
        ]);
    }

    public function generate(Request $request)
    {
        $request->validate([
            'topic' => 'required|string|max:500',
            'preferences' => 'nullable|array',
            'time_limit' => 'nullable|string',
            // Optional client picks from the language / model selectors.
            // Stale or unsupported values silently fall back to defaults
            // (see TaskAssignmentResolver / resolveLanguageName).
            'assignment_id' => 'nullable|integer',
            'language' => 'nullable|string|max:64',
        ]);

        /** @var User $user */
        $user = $request->user();

        $personalizeEnabled = AiContentTask::findByKey('quiz_generate')?->personalize_enabled ?? true;

        $preferences = $personalizeEnabled
            ? (array) $request->input('preferences', [])
            : [];

        try {
            $assignment = $this->assignmentResolver->resolveForTask('quiz_generate', [
                'client_assignment_id' => $request->input('assignment_id'),
                'is_paid_user' => $this->isPaidUser($user),
            ]);

            $result = $this->generationDispatcher->dispatch(
                taskKey: 'quiz_generate',
                userId: $user->id,
                assignment: $assignment,
                language: $this->resolveLanguageName($request->input('language')),
                input: [
                    'topic' => $request->input('topic'),
                    'preferences' => $preferences,
                    'time_limit' => $request->input('time_limit'),
                ],
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

        return response()->json([
            'quiz' => $result->persisted->subject,
            'redirect' => $result->persisted->redirectUrl,
        ]);
    }

    public function show(Request $request, Quiz $quiz)
    {
        $this->authorize('view', $quiz);

        $attempts = $quiz->attempts()
            ->where('user_id', $request->user()->id)
            ->whereNotNull('completed_at')
            ->latest('completed_at')
            ->take(10)
            ->get()
            ->map(fn (QuizAttempt $attempt) => [
                'id' => $attempt->id,
                'score' => $attempt->score,
                'correct_count' => $attempt->correct_count,
                'total_questions' => $attempt->total_questions,
                'time_spent_seconds' => $attempt->time_spent_seconds,
                'completed_at' => $attempt->completed_at?->diffForHumans(),
            ]);

        $best = $attempts->max('score');

        $snapshot = $this->globalConfig->snapshot();

        return Inertia::render('App/Quizzes/Show', [
            'quiz' => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'description' => $quiz->description,
                'topic' => $quiz->topic,
                'question_count' => $quiz->question_count,
                'preferences' => $quiz->preferences ?? [],
                'language' => $quiz->language,
                'ai_model_name' => $quiz->ai_model_name,
                'questions' => $quiz->questions ?? [],
                'created_at' => $quiz->created_at?->diffForHumans(),
            ],
            'attempts' => $attempts,
            'bestScore' => $best,
            'showAiModel' => (bool) $snapshot[AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL],
        ]);
    }

    public function storeAttempt(Request $request, Quiz $quiz)
    {
        $this->authorize('view', $quiz);

        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*' => 'nullable|string',
            'time_spent_seconds' => 'nullable|integer|min:0',
        ]);

        $questions = $quiz->questions ?? [];
        $graded = [];
        $correct = 0;

        foreach ($questions as $index => $question) {
            $userAnswer = (string) ($data['answers'][$index] ?? '');
            $isCorrect = $this->isAnswerCorrect($question, $userAnswer);

            if ($isCorrect) {
                $correct++;
            }

            $graded[] = [
                'question_index' => $index,
                'user_answer' => $userAnswer,
                'is_correct' => $isCorrect,
            ];
        }

        $total = count($questions);
        $score = $total > 0 ? (int) round(($correct / $total) * 100) : 0;

        $attempt = QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $request->user()->id,
            'answers' => $graded,
            'total_questions' => $total,
            'correct_count' => $correct,
            'score' => $score,
            'time_spent_seconds' => $data['time_spent_seconds'] ?? 0,
            'completed_at' => now(),
        ]);

        return response()->json([
            'attempt' => [
                'id' => $attempt->id,
                'score' => $attempt->score,
                'correct_count' => $attempt->correct_count,
                'total_questions' => $attempt->total_questions,
                'time_spent_seconds' => $attempt->time_spent_seconds,
                'answers' => $attempt->answers,
            ],
        ]);
    }

    public function showAttempt(Request $request, Quiz $quiz, QuizAttempt $attempt)
    {
        $this->authorize('view', $quiz);

        abort_if(
            $attempt->quiz_id !== $quiz->id || $attempt->user_id !== $request->user()->id,
            404,
        );

        return response()->json([
            'attempt' => [
                'id' => $attempt->id,
                'score' => $attempt->score,
                'correct_count' => $attempt->correct_count,
                'total_questions' => $attempt->total_questions,
                'time_spent_seconds' => $attempt->time_spent_seconds,
                'answers' => $attempt->answers,
            ],
        ]);
    }

    public function destroy(Quiz $quiz)
    {
        $this->authorize('delete', $quiz);

        $quiz->delete();

        return redirect()->route('app.library');
    }

    private function isAnswerCorrect(array $question, string $userAnswer): bool
    {
        $correct = (string) ($question['correct_answer'] ?? '');

        if ($correct === '' || $userAnswer === '') {
            return false;
        }

        return $this->normalizeAnswer($correct) === $this->normalizeAnswer($userAnswer);
    }

    private function normalizeAnswer(string $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? ''));
    }
}

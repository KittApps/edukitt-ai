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
use App\Models\QuickLearn;
use App\Models\User;
use App\Services\Ai\AiContentGlobalConfig;
use App\Services\Ai\Generation\AiGenerationDispatcher;
use App\Services\Ai\TaskAssignmentResolver;
use App\Services\PersonalizeOptionsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuickLearnController extends Controller
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
        $isPaidUser = $user !== null && ! ($user->subscriptionPlan?->isFree() ?? true);

        $globalConfigSnapshot = $this->globalConfig->snapshot();
        $userCanSelectModel = (bool) $globalConfigSnapshot[AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL];
        $showLanguageSelector = (bool) $globalConfigSnapshot[AiContentGlobalConfig::KEY_SHOW_LANGUAGE_SELECTOR];

        // Per-task admin toggle from the AI content settings page.
        // When OFF the wizard collapses to a single Topic step — no
        // Personalize tab, no preferences round-tripped.
        $personalizeEnabled = AiContentTask::findByKey('quick_learn')?->personalize_enabled ?? true;

        return Inertia::render('App/QuickLearns/Create', [
            'personalizeGroups' => $personalizeEnabled
                ? $this->personalize->groupsForTask('quick_learn')
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
                ? $this->personalize->defaultsForTask('quick_learn')
                : [],
            'personalizeEnabled' => $personalizeEnabled,
            'availableModels' => AiContentTask::pickerOptions('quick_learn'),
            'supportedLanguages' => $globalConfigSnapshot[AiContentGlobalConfig::KEY_SUPPORTED_LANGUAGES],
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
            // Optional client-side picks from the language / model selectors.
            // The resolver vets the assignment_id (task match, plan match,
            // global toggle); resolveLanguageName() vets the language. Stale
            // values silently fall back to defaults so a wizard tab opened
            // before an admin flipped a toggle doesn't break generation.
            'assignment_id' => 'nullable|integer',
            'language' => 'nullable|string|max:64',
        ]);

        /** @var User $user */
        $user = $request->user();

        $personalizeEnabled = AiContentTask::findByKey('quick_learn')?->personalize_enabled ?? true;

        $preferences = $personalizeEnabled
            ? $this->personalize->validateOptionValues(
                'quick_learn',
                $request->input('preferences', []),
            )
            : [];

        try {
            $assignment = $this->assignmentResolver->resolveForTask('quick_learn', [
                'client_assignment_id' => $request->input('assignment_id'),
                'is_paid_user' => $this->isPaidUser($user),
            ]);
        } catch (NoAvailableModelException $e) {
            return $this->noModelResponse($e);
        }

        $languageName = $this->resolveLanguageName($request->input('language'));

        // The dispatcher decides sync vs queued based on the admin
        // toggle. Either way the QuickLearnPersister builds the agent
        // and persists the QuickLearn — this controller no longer
        // needs to know how the AI call is shaped.
        try {
            $result = $this->generationDispatcher->dispatch(
                taskKey: 'quick_learn',
                userId: $user->id,
                assignment: $assignment,
                language: $languageName,
                input: [
                    'topic' => $request->input('topic'),
                    'preferences' => $preferences,
                ],
            );
        } catch (NoAvailableModelException $e) {
            // Sync path can still bubble this from the persister when
            // the assignment is somehow invalid at agent-build time.
            return $this->noModelResponse($e);
        }

        if ($result->queued) {
            return response()->json([
                'queued' => true,
                'generation_id' => $result->generation->id,
            ], 202);
        }

        /** @var QuickLearn $quickLearn */
        $quickLearn = $result->persisted->subject;

        return response()->json([
            'quickLearn' => $quickLearn,
            'redirect' => $result->persisted->redirectUrl,
        ]);
    }

    public function show(QuickLearn $quickLearn)
    {
        $this->authorize('view', $quickLearn);

        $snapshot = $this->globalConfig->snapshot();

        return Inertia::render('App/QuickLearns/Show', [
            'quickLearn' => $quickLearn,
            'showAiModel' => (bool) $snapshot[AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL],
        ]);
    }

    public function destroy(QuickLearn $quickLearn)
    {
        $this->authorize('delete', $quickLearn);

        $quickLearn->delete();

        return redirect()->route('app.library');
    }
}

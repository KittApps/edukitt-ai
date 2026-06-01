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

namespace App\Http\Controllers\App\Concerns;

use App\Exceptions\Ai\NoAvailableModelException;
use App\Models\User;
use App\Services\Ai\AiContentGlobalConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Shared plumbing for app-side generation controllers.
 *
 * Three controllers (Quick Learn, Course outline, Lesson content)
 * need the exact same three pieces of logic around an AI call:
 *
 *   - Translate a client-sent language code into the configured
 *     display name (or fall back to the admin's default language).
 *   - Decide whether the acting user is on a paid plan, for
 *     gating `is_paid_only` model assignments.
 *   - Convert a {@see NoAvailableModelException} into the
 *     "AI is unavailable" response — a generic 503 to the front-end
 *     plus the real reason in the server log, so admins can fix
 *     the misconfig without leaking detail to end users.
 *
 * Lives in a trait (rather than a base controller) so each
 * controller can keep its own inheritance line and explicit
 * dependency list; it only requires a `globalConfig` property of
 * type {@see AiContentGlobalConfig} on the consuming class.
 *
 * @property AiContentGlobalConfig $globalConfig Injected via the
 *     consuming controller's constructor — declared here so static
 *     analyzers don't flag the property access in resolveLanguageName().
 */
trait ResolvesAiSelections
{
    /**
     * Resolve the display name of the language to feed into the
     * agent's `{language}` placeholder.
     *
     * Resolution order:
     *   1. The client's pick (only when the global selector is on
     *      AND the code matches a supported language).
     *   2. The admin's default language.
     *   3. The first supported language.
     *   4. null — agents handle null by omitting the placeholder.
     *
     * @return string|null Display name (e.g. "English"), never a code.
     */
    protected function resolveLanguageName(?string $clientLanguageCode): ?string
    {
        $snapshot = $this->globalConfig->snapshot();
        /** @var array<int, array<string, mixed>> $languages */
        $languages = $snapshot[AiContentGlobalConfig::KEY_SUPPORTED_LANGUAGES] ?? [];
        $selectorOn = (bool) ($snapshot[AiContentGlobalConfig::KEY_SHOW_LANGUAGE_SELECTOR] ?? false);

        if ($selectorOn && $clientLanguageCode !== null && $clientLanguageCode !== '') {
            $code = strtolower(trim($clientLanguageCode));
            foreach ($languages as $lang) {
                if (isset($lang['code']) && $lang['code'] === $code) {
                    return (string) ($lang['name'] ?? '');
                }
            }
        }

        foreach ($languages as $lang) {
            if (! empty($lang['is_default'])) {
                return (string) ($lang['name'] ?? '');
            }
        }

        if (! empty($languages)) {
            return (string) ($languages[0]['name'] ?? null) ?: null;
        }

        return null;
    }

    /**
     * True when the user is on any non-free subscription plan.
     * Used to gate `is_paid_only` model assignments — passed into
     * {@see \App\Services\Ai\TaskAssignmentResolver::resolveForTask()}
     * as the `is_paid_user` context flag.
     */
    protected function isPaidUser(?User $user): bool
    {
        return $user !== null
            && ! ($user->subscriptionPlan?->isFree() ?? true);
    }

    /**
     * Convert a "no model available" exception into the standard
     * user-facing response. We never let the precise reason
     * (no default for task X, withdrawn provider Y, …) reach the
     * UI — that's an admin concern — but we always log it so the
     * admin can fix the misconfig from server logs.
     */
    protected function noModelResponse(NoAvailableModelException $e): JsonResponse
    {
        Log::error('AI generation aborted: no available model.', $e->detail());

        return response()->json([
            'message' => 'AI generation is temporarily unavailable. Please try again shortly or contact your administrator.',
        ], 503);
    }
}

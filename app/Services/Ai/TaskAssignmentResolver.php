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

namespace App\Services\Ai;

use App\Exceptions\Ai\NoAvailableModelException;
use App\Exceptions\Billing\PaidPlanRequiredException;
use App\Models\AiContentTaskAssignment;
use App\Models\AiTokenUsage;
use App\Models\Course;

/**
 * Single source of truth for "which (provider, model) does this
 * generation run on?".
 *
 * Picking the right assignment used to be a one-liner ("the row
 * flagged is_default for the task"), but the multi-model feature
 * adds three orthogonal concerns:
 *
 *   1. End-user client picks (when the admin enabled the model
 *      selector) — validated against the task and the user's plan.
 *   2. Per-task cascades — the `course_lesson` task needs to honour
 *      the model used for the parent course's outline whenever the
 *      admin combined the two stages.
 *   3. Defaults + fallback to the global `default` task — must
 *      never silently drop to "no model" because the LLM call
 *      itself would then crash deep inside laravel/ai with an
 *      unhelpful error.
 *
 * Each concern is a small private helper here so the public surface
 * stays a single `resolveForTask($taskKey, $context)` call. The
 * AiService accepts the resolved AiContentTaskAssignment as a
 * trusted input — no further task/plan checks are run against it.
 *
 * Extending: add a new branch under "task-specific server-side
 * resolution" in {@see self::resolveForTask()} and a sibling
 * private helper. Keep the cross-cutting concerns (client pick,
 * default fallback) in their current positions so they apply to
 * every new task.
 */
class TaskAssignmentResolver
{
    public function __construct(
        private readonly AiContentGlobalConfig $globalConfig,
    ) {}

    /**
     * Resolve the assignment to use for one generation call.
     *
     * Recognised context keys (all optional):
     *
     *  - `client_assignment_id`: int — id picked by the user in the
     *    on-screen model dropdown. Honoured only when the global
     *    "Let users pick the AI model" toggle is ON and the row
     *    belongs to this task AND is plan-allowed for the user.
     *  - `is_paid_user`: bool — gates `is_paid_only` assignments.
     *    Client picks that violate the flag silently fall through to
     *    server-side defaults; if the *resolved* assignment still
     *    requires a paid plan and the user doesn't have one, the
     *    final gate throws {@see PaidPlanRequiredException}. This
     *    catches the "only model configured is paid-only" case the
     *    front-end can't otherwise prevent (the picker has nothing
     *    else to choose).
     *  - `course`: Course — required for the `course_lesson`
     *    cascade so we can look up the parent course's outline
     *    generation in `ai_token_usages`.
     *
     * @param  array<string, mixed>  $context
     *
     * @throws NoAvailableModelException When no assignment exists at all.
     * @throws PaidPlanRequiredException When the only viable assignment
     *     is paid-only and the user is on a free plan.
     */
    public function resolveForTask(string $taskKey, array $context = []): AiContentTaskAssignment
    {
        $isPaidUser = (bool) ($context['is_paid_user'] ?? false);

        // 1. End-user pick wins when it's both globally allowed and
        //    individually allowed (right task, plan-eligible).
        $clientPick = $this->resolveClientPick(
            assignmentId: $this->intOrNull($context['client_assignment_id'] ?? null),
            expectedTaskKey: $taskKey,
            isPaidUser: $isPaidUser,
        );

        $assignment = $clientPick
            ?? $this->resolveServerSide($taskKey, $context);

        // Final gate: regardless of which path produced the
        // assignment (client pick, course_lesson cascade, generic
        // default, global default), free users are not allowed to
        // run on a paid-only model. Throwing here keeps the rule in
        // one place instead of sprinkling `is_paid_only` checks
        // through every cascade.
        $this->assertPlanAllowed($assignment, $isPaidUser, $taskKey);

        return $assignment;
    }

    /**
     * Server-side resolution branch (everything except the client
     * pick). Extracted so the public `resolveForTask` reads as a
     * straight "pick or resolve, then gate" sequence.
     *
     * @param  array<string, mixed>  $context
     */
    private function resolveServerSide(string $taskKey, array $context): AiContentTaskAssignment
    {
        if ($taskKey === 'course_lesson') {
            $course = $context['course'] ?? null;
            if ($course instanceof Course) {
                return $this->resolveForCourseLesson($course);
            }
            // Without a course we can't run the cascade — drop to
            // the generic default below.
        }

        return $this->defaultForTaskOrThrow($taskKey);
    }

    /**
     * Enforce the paid-plan rule on the final resolved assignment.
     * Centralised here so every resolution path (client pick,
     * course_lesson cascade, default fallback, global default) goes
     * through the same check.
     */
    private function assertPlanAllowed(
        AiContentTaskAssignment $assignment,
        bool $isPaidUser,
        string $taskKey,
    ): void {
        if ($assignment->is_paid_only && ! $isPaidUser) {
            throw new PaidPlanRequiredException($taskKey);
        }
    }

    // ─── Cross-cutting helpers ──────────────────────────────────────

    /**
     * Validate a client-side pick. Returns null whenever ANY check
     * fails so the caller can fall through to server defaults — we
     * deliberately don't throw here, because a stale wizard tab
     * choosing a withdrawn model shouldn't break the user's flow.
     */
    private function resolveClientPick(
        ?int $assignmentId,
        string $expectedTaskKey,
        bool $isPaidUser,
    ): ?AiContentTaskAssignment {
        if ($assignmentId === null) {
            return null;
        }

        if (! $this->globalConfig->get(AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL)) {
            return null;
        }

        $assignment = AiContentTaskAssignment::query()
            ->with(['task:id,key', 'provider', 'model'])
            ->whereKey($assignmentId)
            ->first();

        if (! $assignment || ! $assignment->provider || ! $assignment->model) {
            return null;
        }
        if ($assignment->task?->key !== $expectedTaskKey) {
            return null;
        }
        if ($assignment->is_paid_only && ! $isPaidUser) {
            return null;
        }

        return $assignment;
    }

    /**
     * Look up the task's flagged default; fall back to the reserved
     * `default` task slot; throw if both are missing. Always returns
     * a fully-hydrated assignment (with provider + model loaded) so
     * the AiService can hand the slug/model id straight to the LLM
     * without a follow-up query.
     */
    private function defaultForTaskOrThrow(string $taskKey): AiContentTaskAssignment
    {
        $assignment = AiContentTaskAssignment::defaultForTaskKey($taskKey);

        if (($assignment === null || $assignment->provider === null || $assignment->model === null)
            && $taskKey !== 'default'
        ) {
            $assignment = AiContentTaskAssignment::defaultForTaskKey('default');
        }

        if ($assignment === null || $assignment->provider === null || $assignment->model === null) {
            throw NoAvailableModelException::forTask($taskKey);
        }

        return $assignment;
    }

    // ─── course_lesson cascade ─────────────────────────────────────

    /**
     * Pick the model for a lesson inside a known course.
     *
     * Decision tree:
     *
     *   merged-mode? ─── yes ──▶ reuse outline's model (verified)
     *        │                       │ verify failed ───▶ default
     *        │                       │ no usage row ────▶ default
     *        │
     *        no
     *        │
     *        ▼
     *   course_lesson default? ── yes ──▶ use it
     *        │
     *        no
     *        ▼
     *   reuse outline's model (verified) — i.e. behave like merged
     *
     * "Merged-mode" = either `user_can_select_model` (the picker UX
     * implies outline + lesson are one) or `merge_course_generation`
     * (the explicit admin opt-in). "Verified" = the outline row's
     * (provider, model) pair still appears in the current
     * `course_outline` assignments list; admins can withdraw a
     * provider after a course was generated and we must respect
     * that withdrawal.
     */
    private function resolveForCourseLesson(Course $course): AiContentTaskAssignment
    {
        if (! $this->isCourseMerged()) {
            $lessonDefault = AiContentTaskAssignment::defaultForTaskKey('course_lesson');
            if ($lessonDefault !== null
                && $lessonDefault->provider !== null
                && $lessonDefault->model !== null
            ) {
                return $lessonDefault;
            }
            // Admin enabled split mode but never picked a
            // course_lesson default → behave like merged so the
            // course still completes instead of hard-erroring.
        }

        $fromOutline = $this->reuseOutlineModelFor($course);
        if ($fromOutline !== null) {
            return $fromOutline;
        }

        // Outline ran on a model that's since been withdrawn, OR
        // we have no outline usage row at all — fall through to
        // the global default.
        return $this->defaultForTaskOrThrow('default');
    }

    private function isCourseMerged(): bool
    {
        return (bool) $this->globalConfig->get(AiContentGlobalConfig::KEY_USER_CAN_SELECT_MODEL)
            || (bool) $this->globalConfig->get(AiContentGlobalConfig::KEY_MERGE_COURSE_GENERATION);
    }

    /**
     * Locate the course_outline assignment whose (provider, model)
     * matches the one actually used to generate this course's
     * outline. Returns null when either the usage row is missing
     * or the matching assignment has been withdrawn.
     */
    private function reuseOutlineModelFor(Course $course): ?AiContentTaskAssignment
    {
        $usage = AiTokenUsage::query()
            ->where('trackable_type', $course->getMorphClass())
            ->where('trackable_id', $course->getKey())
            ->where('task_type', 'course_outline')
            ->whereNotNull('ai_provider_id')
            ->whereNotNull('ai_provider_model_id')
            ->latest('created_at')
            ->first();

        if ($usage === null) {
            return null;
        }

        return AiContentTaskAssignment::query()
            ->with(['provider', 'model', 'task:id,key'])
            ->whereHas('task', fn ($q) => $q->where('key', 'course_outline'))
            ->where('ai_provider_id', $usage->ai_provider_id)
            ->where('ai_provider_model_id', $usage->ai_provider_model_id)
            ->first();
    }

    private function intOrNull(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value)) {
            return (int) $value;
        }

        return null;
    }
}

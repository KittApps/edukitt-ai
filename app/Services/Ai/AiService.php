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

use App\Ai\Tracking\Pricing\PricingResolver;
use App\Ai\Tracking\TokenContext;
use App\Ai\Tracking\TokenRecorder;
use App\Exceptions\Billing\OutOfCreditsException;
use App\Models\AiContentTaskAssignment;
use App\Models\User;
use App\Services\Ai\Telemetry\FailureLogger;
use App\Services\Billing\AccessGuard;
use App\Services\Billing\CreditPricingService;
use App\Services\Billing\CreditService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Responses\AgentResponse;
use Throwable;

class AiService
{
    /**
     * Token estimate per ~4 characters of input when the agent has not
     * yet been invoked. Used by the pre-check estimate so a request
     * cannot proceed without enough credits even if the actual cost
     * lands lower than the upper bound.
     */
    private const PRECHECK_CHARS_PER_TOKEN = 4;

    /**
     * Conservative output token assumption for the pre-check. Real
     * runs are usually much smaller; this is the credit "reservation".
     */
    private const PRECHECK_OUTPUT_TOKEN_CAP = 2048;

    public function __construct(
        private readonly TokenRecorder $tokenRecorder,
        private readonly CreditService $credits,
        private readonly CreditPricingService $pricing,
        private readonly AccessGuard $accessGuard,
        private readonly PricingResolver $modelPricing,
        private readonly TaskAssignmentResolver $assignmentResolver,
        private readonly FailureLogger $failureLogger,
    ) {}

    /**
     * Resolve the provider Lab enum from the provider slug stored in
     * ai_providers.slug. The Lab enum is backed by the same slug strings,
     * so any provider supported by laravel/ai just works.
     */
    public function resolveProvider(string $slug): ?Lab
    {
        return Lab::tryFrom($slug);
    }

    /**
     * Expand an assignment row into the laravel/ai call args.
     *
     * Returns [provider Lab|string, model string, temperature, max_tokens].
     * Centralised here (rather than inlined into prompt()) so anything
     * that needs the same expansion — analytics, dry-run estimators —
     * can lean on the same logic.
     */
    public function unpackAssignment(AiContentTaskAssignment $assignment): array
    {
        return [
            $this->resolveProvider($assignment->provider->slug),
            $assignment->model->model_id,
            (float) $assignment->temperature,
            (int) $assignment->max_tokens,
        ];
    }

    /**
     * Prompt an agent for a given task.
     *
     * Single entry point for all AI calls. Callers either pass a
     * pre-resolved {@see AiContentTaskAssignment} (the trusted path —
     * typically obtained from {@see TaskAssignmentResolver} which
     * applies any per-task cascade, plan gating, and client-pick
     * validation in one place), or omit it to let this method resolve
     * the task's default.
     *
     * Pushes the task type and acting user into Laravel's Context
     * facade so the RecordTokenUsage listener can attribute the
     * resulting AgentPrompted event to the correct user and content
     * type. Context is cleared after the call so a follow-up agent
     * invocation in the same request does not inherit stale state.
     *
     * @param  Agent  $agent  Concrete agent instance (QuickLearnAgent, QuizAgent, ...)
     * @param  string  $prompt  The user/system prompt to send
     * @param  string  $taskType  Logical task identifier (e.g. 'quick_learn', 'course_outline')
     * @param  array  $attachments  Optional file attachments forwarded to the model
     * @param  ?int  $userId  Acting user id for token attribution; null for system runs
     * @param  ?AiContentTaskAssignment  $assignment  Trusted, already-vetted assignment.
     *                                                When null we resolve the task default
     *                                                (with the global `default` task as
     *                                                last-resort fallback) via the
     *                                                {@see TaskAssignmentResolver}.
     */
    public function prompt(
        Agent $agent,
        string $prompt,
        string $taskType,
        array $attachments = [],
        ?int $userId = null,
        ?AiContentTaskAssignment $assignment = null,
    ) {
        $assignment ??= $this->assignmentResolver->resolveForTask($taskType);

        [$providerLab, $model, $temperature, $maxTokens] = $this->unpackAssignment($assignment);

        $args = ['prompt' => $prompt];

        if ($providerLab) {
            $args['provider'] = $providerLab;
        }
        if ($model) {
            $args['model'] = $model;
        }
        if (! empty($attachments)) {
            $args['attachments'] = $attachments;
        }

        $timeoutSeconds = (int) config('ai.request_timeout', 300);
        if ($timeoutSeconds > 0) {
            $args['timeout'] = $timeoutSeconds;
        }

        $providerSlug = $providerLab?->value;

        $user = $userId !== null
            ? User::query()->find($userId)
            : null;

        if ($user !== null) {
            $this->accessGuard->assertCanCreate($user, $taskType);

            if ($this->pricing->creditsEnabled()) {
                $estimate = $this->preCheckEstimate($prompt, $providerSlug, $model);
                $this->credits->assertHasCredits($user, $estimate);
            }
        }

        TokenContext::bind($taskType, $userId);

        try {
            $response = $this->invokeWithRetry(fn () => $agent->prompt(...$args), $taskType);
        } catch (Throwable $e) {
            // Reached only after retry() has exhausted its attempt budget,
            // so this is a genuine provider give-up — exactly what the
            // failures analytics page tracks. Pre-flight billing / plan
            // exceptions are thrown earlier and never hit this catch.
            $this->failureLogger->record($e, $taskType, $userId, $providerSlug);

            throw $e;
        } finally {
            TokenContext::clear();
        }

        if ($user !== null && $response instanceof AgentResponse) {
            $this->postCharge($user, $response, $taskType, $providerSlug, $model);
        }

        return $response;
    }

    /**
     * Estimate how many credits a request will cost before invoking the
     * model. The number is intentionally conservative — actual usage is
     * reconciled in postCharge() so the user's balance always tracks
     * reality even if our estimate over-shot.
     */
    private function preCheckEstimate(string $prompt, ?string $providerSlug, ?string $modelId): int
    {
        $rates = $this->modelPricing->resolve($providerSlug, $modelId);
        $inputTokens = max(1, (int) ceil(mb_strlen($prompt) / self::PRECHECK_CHARS_PER_TOKEN));

        $costs = $rates->calculate($inputTokens, self::PRECHECK_OUTPUT_TOKEN_CAP);

        return $this->pricing->estimateCreditsFor($costs['input_cost'], $costs['output_cost']);
    }

    /**
     * Debit the actual credits used after the LLM returned. Tolerant of
     * failures — credit accounting must not break a successful response.
     */
    private function postCharge(
        User $user,
        AgentResponse $response,
        string $taskType,
        ?string $providerSlug,
        ?string $modelId,
    ): void {
        try {
            $usage = $response->usage;
            $providerSlug ??= $response->meta->provider ?? null;
            $modelId ??= $response->meta->model ?? null;

            $rates = $this->modelPricing->resolve($providerSlug, $modelId);

            $inputTokens = $usage->promptTokens
                + $usage->cacheReadInputTokens
                + $usage->cacheWriteInputTokens;
            $outputTokens = $usage->completionTokens + $usage->reasoningTokens;

            $costs = $rates->calculate($inputTokens, $outputTokens);
            $credits = $this->pricing->creditsFor($costs['total_cost']);

            $this->credits->debit($user, $credits, $taskType);
        } catch (OutOfCreditsException $e) {
            // Surfaced by the lockForUpdate path inside debit() when a
            // racing request drained the balance. The successful AI
            // response still happened; we simply log this and let the
            // user continue. Future audits can catch it via Laravel's log.
            Log::warning('[billing] post-charge race against empty balance', [
                'user_id' => $user->id,
                'task' => $taskType,
                'required' => $e->required,
            ]);
        } catch (Throwable $e) {
            Log::warning('[billing] failed to debit credits after AI call', [
                'user_id' => $user->id,
                'task' => $taskType,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Run the agent invocation with config-driven retry on transient
     * provider errors. Centralised here so every AI call (course outline,
     * lesson content, quick learn, quiz, content summary, …) benefits
     * without each caller having to bake in retry logic itself.
     */
    private function invokeWithRetry(callable $invoke, string $taskType): mixed
    {
        if (! config('ai.retry.enabled', false)) {
            return $invoke();
        }

        $retries = max(0, (int) config('ai.retry.attempts', 1));
        $delayMs = max(0, (int) config('ai.retry.delay', 3000));

        // Laravel's retry() counts total attempts, so 1 original + N retries.
        $totalAttempts = $retries + 1;
        $currentAttempt = 0;

        return retry(
            $totalAttempts,
            function () use ($invoke, &$currentAttempt) {
                $currentAttempt++;

                return $invoke();
            },
            $delayMs,
            function (Throwable $e) use ($taskType, $totalAttempts, &$currentAttempt) {
                if ($e instanceof ConnectionException) {
                    return false;
                }

                Log::warning('AI request failed, will retry', [
                    'task' => $taskType,
                    'attempt' => $currentAttempt,
                    'of' => $totalAttempts,
                    'error' => $e->getMessage(),
                ]);

                return true;
            },
        );
    }

    /**
     * Attach a generated subject (Quiz, QuickLearn, Course, Lesson, ...) to
     * the token usage row produced by the most recent prompt() call.
     *
     * Controllers call this after they've persisted the resulting model:
     *
     *   $response = AiService::prompt(...);
     *   $quiz = Quiz::create([...]);
     *   AiService::linkUsage($response, $quiz);
     */
    public function linkUsage(?AgentResponse $response, Model $subject): void
    {
        if ($response === null || ! $response->invocationId) {
            return;
        }

        $this->tokenRecorder->linkSubject($response->invocationId, $subject);
    }
}

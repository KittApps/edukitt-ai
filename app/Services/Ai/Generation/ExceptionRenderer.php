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

namespace App\Services\Ai\Generation;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Convert any exception thrown by an AI generation into the same JSON
 * envelope the sync path would have produced.
 *
 * The sync path relies on Laravel's exception handler calling each
 * exception's `render(Request)` method:
 *
 *   - {@see \App\Exceptions\Billing\FeatureLimitReachedException} →
 *     `{ok, reason: 'feature_limit'|'expired_plan', message, feature, cta}` (HTTP 402)
 *   - {@see \App\Exceptions\Billing\OutOfCreditsException} →
 *     `{ok, reason: 'out_of_credits', message, required, available, cta}` (HTTP 402)
 *
 * The queue path has no real HTTP request to hand `render()` either,
 * so this helper builds a fake JSON-expecting request and invokes the
 * exception's own renderer. The returned payload gets stored on the
 * {@see \App\Models\AiGeneration} row and surfaced verbatim by the
 * polling endpoint — at which point the front-end's existing
 * `billing:limit-reached` event flow lights up exactly the same modal
 * a sync caller would have seen.
 *
 * Exceptions that don't implement `render()` are wrapped in a
 * `{message}` envelope using either a dev-mode raw message or the
 * generic user-facing fallback.
 */
class ExceptionRenderer
{
    private const GENERIC_FALLBACK = 'Generation failed. Please try again or contact support if the problem persists.';

    /**
     * @return array{status:int, payload:array<string, mixed>}
     */
    public function render(Throwable $e): array
    {
        if (method_exists($e, 'render')) {
            try {
                $response = $e->render($this->fakeJsonRequest());
                if ($response instanceof JsonResponse) {
                    $payload = $response->getData(true);
                    if (is_array($payload)) {
                        return [
                            'status' => $response->getStatusCode(),
                            'payload' => $payload,
                        ];
                    }
                }
            } catch (Throwable) {
                // Fall through to the generic envelope below — never
                // let a bad render() override the original failure.
            }
        }

        // Generic fallback: surface the real exception message in
        // local/dev so devs see what actually broke, but keep prod
        // users on the safe generic copy.
        $message = config('app.debug')
            ? ($e->getMessage() ?: self::GENERIC_FALLBACK)
            : self::GENERIC_FALLBACK;

        return [
            'status' => 500,
            'payload' => ['message' => $message],
        ];
    }

    /**
     * Synthetic Request with `Accept: application/json` set so any
     * exception's `render()` takes the API branch instead of the
     * Inertia/redirect branch.
     */
    private function fakeJsonRequest(): Request
    {
        $request = Request::create('/', 'POST');
        $request->headers->set('Accept', 'application/json');

        return $request;
    }
}

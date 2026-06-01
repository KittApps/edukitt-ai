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

namespace App\Exceptions\Billing;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Thrown by CreditService when a user attempts an AI generation but
 * does not have enough credits to cover the (estimated or actual) cost.
 *
 * The HTTP layer converts this into a JSON {ok:false, reason:'out_of_credits'}
 * response for axios callers and into a flash + back redirect for Inertia
 * navigations — see Handler.
 */
class OutOfCreditsException extends RuntimeException
{
    public function __construct(
        public readonly int $required,
        public readonly int $available,
        ?string $message = null,
    ) {
        parent::__construct(
            $message ?? "Not enough credits: need {$required}, have {$available}.",
        );
    }

    public function render(Request $request): Response
    {
        $payload = [
            'ok' => false,
            'reason' => 'out_of_credits',
            'message' => 'You are out of credits. Buy more credits to keep creating.',
            'required' => $this->required,
            'available' => $this->available,
            'cta' => [
                'type' => 'buy_credits',
                'href' => route('app.subscription').'?tab=credits',
            ],
        ];

        if ($request->expectsJson() || $request->wantsJson()) {
            return new JsonResponse($payload, 402);
        }

        return self::redirectWithLimit($request, $payload);
    }

    /**
     * Build the Inertia/legacy fallback response. Stashes the payload
     * in the session as `limit_reached` so the global LimitReachedModal
     * can pick it up on the next request.
     */
    public static function redirectWithLimit(Request $request, array $payload): RedirectResponse
    {
        return back()
            ->with('limit_reached', $payload)
            ->withErrors(['credits' => $payload['message']]);
    }
}

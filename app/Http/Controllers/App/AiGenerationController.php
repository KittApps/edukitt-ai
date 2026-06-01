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
use App\Models\AiGeneration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Polling endpoint for queued AI generations.
 *
 * The wizard's "Generating..." view (same UI as today regardless of
 * the queue toggle) silently hits this endpoint every few seconds
 * when the controller returned `{ queued: true, generation_id }`.
 * It expects one of three states:
 *
 *   pending / running → keep polling
 *   completed         → navigate to `redirect`, or render `payload`
 *                       on the next wizard step (Course Outline)
 *   failed            → surface `error` in the same banner the sync
 *                       path's 503 would.
 *
 * The response shape is intentionally the smallest superset of both
 * "subject-shaped" (Quick Learn, Quiz, Course Quiz) and "payload-
 * shaped" (Course Outline) results so the front-end helper can
 * treat both flows identically.
 *
 * Authorization: row must belong to the polling user. Anything else
 * is a 404, not a 403, so probing IDs leaks no information.
 */
class AiGenerationController extends Controller
{
    public function status(Request $request, AiGeneration $generation): JsonResponse
    {
        if ($generation->user_id !== $request->user()->id) {
            abort(404);
        }

        return response()->json([
            'id' => $generation->id,
            'status' => $generation->status,
            'redirect' => $generation->redirect_url,
            'payload' => $generation->result_payload,
            // On failure this is the same JSON envelope the sync path
            // would have returned from the exception's render() — see
            // ExceptionRenderer. Front-end's submitAiGeneration helper
            // re-fires the global billing:limit-reached event when
            // `reason` is present so the LimitReachedModal lights up
            // exactly as it would on the sync path.
            'error' => $generation->error_payload,
        ]);
    }
}

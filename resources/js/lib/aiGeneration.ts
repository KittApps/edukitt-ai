import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Single helper any wizard uses to submit an AI generation.
 *
 * Hides the difference between the two response shapes the backend
 * can return depending on the admin "Process AI requests via queue"
 * toggle:
 *
 *   - sync (toggle off) — the controller already ran the agent and
 *     responded with the full payload (`redirect`, `title`, …).
 *     We return the response data verbatim.
 *
 *   - queued (toggle on) — the controller dispatched a job and
 *     responded with `{ queued: true, generation_id }`. We silently
 *     poll the status endpoint until the row reaches a terminal
 *     state, then return the *same shape* the sync path would have
 *     returned, by hydrating from the row's stored `redirect` /
 *     `payload`. From the caller's perspective the two paths are
 *     indistinguishable — the wizard's existing "Generating..." UI
 *     just stays up a little longer.
 *
 * Polling cadence is tuned to feel snappy without hammering the
 * server: 1.2 s between polls, no hard timeout (the user controls
 * how long they wait — they can close the tab or come back later
 * and the job keeps running).
 */

const POLL_INTERVAL_MS = 1200;

const STATUS_BASE = '/app/ai-generations';

interface QueuedAck {
    queued: true;
    generation_id: number;
}

interface SyncResponse {
    queued?: false;
    [key: string]: unknown;
}

/**
 * Same envelope the sync path returns from an exception's `render()`:
 *
 *   - `message`  — user-facing copy, always present
 *   - `reason`   — billing variant (`feature_limit` | `expired_plan` |
 *                  `out_of_credits`) when this is a billing rejection
 *   - everything else (`feature`, `cta`, `required`, …) is forwarded
 *     verbatim so the LimitReachedModal renders the same as on sync
 */
interface ErrorEnvelope {
    message?: string;
    reason?: string;
    [key: string]: unknown;
}

interface StatusResponse {
    id: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    redirect: string | null;
    payload: Record<string, unknown> | null;
    error: ErrorEnvelope | null;
}

/**
 * Submit a generation request to a wizard endpoint and resolve with
 * the same shape the endpoint returns on the sync path.
 *
 * For queued runs the returned object is built from the status row:
 *   - `redirect`  → mapped from the row's `redirect_url`
 *   - whatever else the persister put in the row's `result_payload`
 *     (Course Outline's `title` / `description` / `outline`)
 *
 * Throws on the request itself (network / 4xx / 5xx) or when the
 * generation row finalises as `failed` — the wizard treats both the
 * same way (revert the "Generating..." view + show an error).
 */
export async function submitAiGeneration<TResponse extends Record<string, unknown>>(
    url: string,
    data: unknown,
    config: AxiosRequestConfig = {},
): Promise<TResponse> {
    const response = (await axios.post(url, data, config)) as AxiosResponse<
        QueuedAck | SyncResponse
    >;

    if (isQueuedAck(response.data)) {
        const status = await pollUntilTerminal(response.data.generation_id);
        return statusToResponseShape<TResponse>(status);
    }

    return response.data as TResponse;
}

function isQueuedAck(data: unknown): data is QueuedAck {
    if (data === null || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return obj.queued === true && typeof obj.generation_id === 'number';
}

async function pollUntilTerminal(generationId: number): Promise<StatusResponse> {
    // Disable axios retries / Inertia interception for the poll loop —
    // each call is independent and we want fast failures to surface
    // immediately rather than getting swallowed.
    const url = `${STATUS_BASE}/${generationId}/status`;

    // Brief lead-in: jobs almost never finish in < 250 ms, so doing
    // the first poll immediately would only ever observe `pending`.
    await sleep(POLL_INTERVAL_MS);

    while (true) {
        const { data } = await axios.get<StatusResponse>(url, {
            headers: { 'X-Inertia': '' }, // bypass Inertia request handling
        });

        if (data.status === 'completed') {
            return data;
        }
        if (data.status === 'failed') {
            throw failureFromEnvelope(data.error);
        }

        await sleep(POLL_INTERVAL_MS);
    }
}

/**
 * Convert the polling endpoint's error envelope into the same outcome
 * the sync path produces:
 *
 *   - billing envelopes (HTTP 402 + `reason`) → dispatch the global
 *     `billing:limit-reached` event so the existing LimitReachedModal
 *     opens. This mirrors what the axios response interceptor in
 *     bootstrap.ts does for sync responses.
 *   - everything else → just throw with the message so the wizard's
 *     existing catch can surface it.
 *
 * Either way an Error is thrown so the wizard's "Generating..." UI
 * reverts.
 */
function failureFromEnvelope(error: ErrorEnvelope | null): Error {
    const envelope = error ?? {};
    const message =
        typeof envelope.message === 'string' && envelope.message.length > 0
            ? envelope.message
            : 'Generation failed. Please try again.';

    if (typeof envelope.reason === 'string') {
        window.dispatchEvent(
            new CustomEvent('billing:limit-reached', { detail: envelope }),
        );
    }

    return new AiGenerationFailedError(message);
}

function statusToResponseShape<TResponse extends Record<string, unknown>>(
    status: StatusResponse,
): TResponse {
    const out: Record<string, unknown> = {
        ...(status.payload ?? {}),
    };
    if (status.redirect !== null) {
        out.redirect = status.redirect;
    }
    return out as TResponse;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export class AiGenerationFailedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AiGenerationFailedError';
    }
}

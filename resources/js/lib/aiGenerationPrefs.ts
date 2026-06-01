/**
 * Per-task persistence of the user's last "Ready to go" picks
 * (language + model) in a long-lived cookie, so a returning user
 * doesn't have to re-pick their preferred model every time.
 *
 * One cookie per task key so the three wizards (Quick Learn, Quiz,
 * Course) keep their selections independent — a course generator
 * might prefer a deep-reasoning model while quick-learns run on a
 * fast one. Cookie is saved right when the user clicks Generate, so
 * we only persist deliberate picks (not e.g. abandoned drafts).
 *
 * Cookie name pattern:  `aigen_prefs_<taskKey>`
 * Cookie value:         URL-encoded JSON `{ language, assignmentId }`
 *
 * Resolution on read deliberately *validates* the saved value
 * against the currently-available options (the admin may have
 * withdrawn the model, downgraded the user, or removed the
 * language) so a stale cookie never bypasses the current backend
 * config — it just silently falls through to the admin's default.
 */

const COOKIE_PREFIX = 'aigen_prefs_';
const COOKIE_TTL_DAYS = 365;

export interface SavedAiGenerationPrefs {
    language?: string | null;
    assignmentId?: number | null;
}

interface LanguageLike {
    code: string;
    is_default?: boolean;
}

interface AssignmentLike {
    id: number;
    is_default: boolean;
    is_paid_only: boolean;
}

/** Read prefs from cookie. Returns `{}` when missing or malformed. */
export function loadAiGenerationPrefs(taskKey: string): SavedAiGenerationPrefs {
    const raw = readCookie(COOKIE_PREFIX + taskKey);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed === null || typeof parsed !== 'object') return {};
        const obj = parsed as Record<string, unknown>;
        return {
            language: typeof obj.language === 'string' ? obj.language : null,
            assignmentId:
                typeof obj.assignmentId === 'number' ? obj.assignmentId : null,
        };
    } catch {
        return {};
    }
}

/**
 * Persist the user's current picks. Caller passes only the values
 * whose corresponding picker is visible — invisible ones get stored
 * as `null` so the cookie always reflects exactly what the user can
 * see, never a stale value from a previous admin configuration.
 */
export function saveAiGenerationPrefs(
    taskKey: string,
    prefs: SavedAiGenerationPrefs,
): void {
    writeCookie(COOKIE_PREFIX + taskKey, JSON.stringify(prefs), COOKIE_TTL_DAYS);
}

/**
 * Pick the initial language to display in the dropdown. Order:
 *   1. The cookie value, if it still appears in `supported`.
 *   2. The user's current system locale (from the header
 *      LanguageSwitcher), if a supported language has that code.
 *      Matched case-insensitively and against the leading subtag
 *      (`en-GB` → `en`) so admins don't have to mirror every
 *      regional variant they ship in the UI.
 *   3. The admin-flagged default.
 *   4. The first supported language.
 *   5. `null` (no language picker available).
 *
 * The system locale step means a returning user who already switched
 * the UI to Sinhala doesn't have to also switch the generation
 * dropdown — the picker lines up with the rest of their session
 * automatically, unless they overrode it with their last pick.
 */
export function resolveInitialLanguage(
    saved: string | null | undefined,
    supported: LanguageLike[],
    systemLocale?: string | null,
): string | null {
    if (saved && supported.some((l) => l.code === saved)) {
        return saved;
    }
    if (systemLocale) {
        const localeLower = systemLocale.toLowerCase();
        const localeBase = localeLower.split('-')[0];
        const match = supported.find((l) => {
            const code = l.code.toLowerCase();
            return code === localeLower || code === localeBase;
        });
        if (match) return match.code;
    }
    return (
        supported.find((l) => l.is_default)?.code
        ?? supported[0]?.code
        ?? null
    );
}

/**
 * Pick the initial model assignment to display. Mirrors the backend's
 * own preference order:
 *   1. The cookie value, if it still exists *and* the user is
 *      plan-eligible (a downgraded user can't keep a paid pick).
 *   2. The task's `is_default` row.
 *   3. The first plan-eligible row.
 *   4. The first row (even if locked — the dropdown will render it
 *      disabled and the backend will block the generate call).
 */
export function resolveInitialAssignment(
    saved: number | null | undefined,
    available: AssignmentLike[],
    isPaidUser: boolean,
): number | null {
    if (saved != null) {
        const match = available.find((m) => m.id === saved);
        if (match && (!match.is_paid_only || isPaidUser)) {
            return match.id;
        }
    }
    return (
        available.find((m) => m.is_default)?.id
        ?? available.find((m) => !m.is_paid_only || isPaidUser)?.id
        ?? available[0]?.id
        ?? null
    );
}

// ─── Cookie I/O ─────────────────────────────────────────────────────

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const target = name + '=';
    const parts = document.cookie.split(';');
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith(target)) {
            try {
                return decodeURIComponent(trimmed.slice(target.length));
            } catch {
                return null;
            }
        }
    }
    return null;
}

function writeCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
        `${name}=${encodeURIComponent(value)}` +
        `; Expires=${expires.toUTCString()}` +
        `; Path=/` +
        `; SameSite=Lax` +
        secure;
}

/**
 * One (provider, model) configuration eligible for a task. `id` is
 * absent for assignments the admin has added in the UI but not yet
 * saved to the DB; the bulk save endpoint round-trips the whole set
 * so we don't need a stable id client-side beyond the lifetime of
 * the editor.
 */
export interface Assignment {
    id?: number;
    ai_provider_id: number | null;
    ai_provider_model_id: number | null;
    temperature: number;
    max_tokens: number;
    is_default: boolean;
    is_paid_only: boolean;
    sort_order: number;
}

/**
 * Per-task admin Configuration knobs. Every key is always present in
 * the payload (with sensible defaults from the DB column) so the UI
 * doesn't have to handle `undefined` — `applicable_config` decides
 * which keys are *meaningful* for the task and therefore rendered.
 */
export interface TaskConfig {
    personalize_enabled: boolean;
    resources_enabled: boolean;
    resources_max_files: number;
    resources_max_file_size_mb: number;
}

export type TaskConfigKey = keyof TaskConfig;

/**
 * One generation task the admin can configure (course_outline,
 * quick_learn, content_summary, …). `allows_multiple` is computed
 * by the controller — true for user-facing tasks that should expose
 * a model picker to the end user, false for the reserved `default`
 * fallback slot and any `is_internal` task.
 */
export interface AiContentTask {
    id: number;
    key: string;
    label: string;
    description: string | null;
    is_internal: boolean;
    allows_multiple: boolean;
    assignments: Assignment[];
    config: TaskConfig;
    applicable_config: TaskConfigKey[];
}

export interface Provider {
    id: number;
    name: string;
    slug: string;
    models: { id: number; name: string; model_id: string }[];
}

/**
 * Back-compat alias for the previous single-row "Config" type so the
 * older NavPanel / nav-item components keep compiling while they
 * migrate to the assignment-based shape.
 */
export interface TaskType {
    key: string;
    label: string;
}

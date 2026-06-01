import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    Crown,
    Lock,
    Plus,
    Save,
    Shield,
    Trash2,
    Users,
} from 'lucide-react';
import type { AiContentTask, Assignment, Provider } from './types';

interface Props {
    task: AiContentTask;
    providers: Provider[];
    hasDefault: boolean;
    defaultProvider: Provider | undefined;
    defaultModel: Provider['models'][number] | undefined;
}

/**
 * Editable list of (provider, model) assignments for one task.
 *
 * For user-facing tasks the admin can add many rows and pick which
 * one is the runtime default. For internal tasks and the reserved
 * `default` fallback slot the table is locked to a single row and
 * the default radio is hidden — the lone row is implicitly default.
 *
 * Drafts live in local state; on Save we POST the whole set to the
 * bulk-replace endpoint and trigger an Inertia reload so the page
 * picks up the canonical rows back from the server.
 */
export default function TaskAssignmentsCard({
    task,
    providers,
    hasDefault,
    defaultProvider,
    defaultModel,
}: Props) {
    const allowMultiple = task.allows_multiple;

    // Reset local drafts whenever the active task changes — drafts
    // are deliberately per-editor and aren't preserved across task
    // switches.
    const [draft, setDraft] = useState<Assignment[]>(() => seed(task));
    useEffect(() => {
        setDraft(seed(task));
    }, [task.id]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialKey = useMemo(() => serialize(task.assignments), [task.assignments]);
    const draftKey = useMemo(() => serialize(draft), [draft]);
    const dirty = initialKey !== draftKey;

    const update = (index: number, patch: Partial<Assignment>) => {
        setDraft((prev) =>
            prev.map((a, i) => {
                if (i !== index) {
                    // Single-default rule: flipping is_default on one
                    // row clears it on the others.
                    if (patch.is_default === true) {
                        return { ...a, is_default: false };
                    }
                    return a;
                }
                const next = { ...a, ...patch };
                if (
                    'ai_provider_id' in patch &&
                    patch.ai_provider_id !== a.ai_provider_id
                ) {
                    // Provider switched → blank the model since it
                    // belonged to the old provider.
                    next.ai_provider_model_id = null;
                }
                return next;
            }),
        );
    };

    const addRow = () => {
        if (!allowMultiple && draft.length >= 1) {
            return;
        }
        setDraft((prev) => [
            ...prev,
            {
                ai_provider_id: null,
                ai_provider_model_id: null,
                temperature: 0.7,
                max_tokens: 4096,
                is_default: prev.length === 0,
                is_paid_only: false,
                sort_order: prev.length,
            },
        ]);
    };

    const removeRow = (index: number) => {
        setDraft((prev) => {
            const next = prev.filter((_, i) => i !== index);
            // Removing the default row → promote the first remaining
            // row so there's always exactly one default.
            if (prev[index]?.is_default && next.length > 0) {
                next[0] = { ...next[0], is_default: true };
            }
            return next.map((a, i) => ({ ...a, sort_order: i }));
        });
    };

    const hasIncomplete = draft.some(
        (a) => !a.ai_provider_id || !a.ai_provider_model_id,
    );
    const defaultCount = draft.filter((a) => a.is_default).length;
    const requireDefault = allowMultiple && draft.length > 0 && defaultCount !== 1;

    const canSave = dirty && !saving && !hasIncomplete && !requireDefault;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const payload = draft.map((a, i) => ({
                ai_provider_id: a.ai_provider_id,
                ai_provider_model_id: a.ai_provider_model_id,
                temperature: a.temperature,
                max_tokens: a.max_tokens,
                is_default:
                    allowMultiple ? a.is_default : true,
                is_paid_only: a.is_paid_only,
                sort_order: a.sort_order ?? i,
            }));
            await axios.post(
                `/admin/settings/ai-content/${task.key}/assignments`,
                { assignments: payload },
            );
            router.reload({ only: ['tasks'] });
        } catch (e: unknown) {
            const message =
                axios.isAxiosError(e) && e.response?.data?.message
                    ? String(e.response.data.message)
                    : 'Failed to save. Check the form and try again.';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const isDefaultTask = task.key === 'default';
    const showFallbackNote = !isDefaultTask && draft.length === 0 && hasDefault;

    return (
        <div className="space-y-5">
            {/* Notices */}
            {task.is_internal && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-on-surface/[0.04] border border-on-surface/10 text-xs text-on-surface-variant leading-relaxed">
                    <Lock size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                        <strong className="font-bold text-on-surface">Internal task.</strong>{' '}
                        Used by the platform; end users will never pick a model for this.
                        Limited to a single provider/model.
                    </span>
                </div>
            )}
            {isDefaultTask && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-800 leading-relaxed">
                    <Shield size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                        Fallback configuration. Any task without its own provider will use this.
                    </span>
                </div>
            )}
            {showFallbackNote && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-800 leading-relaxed">
                    <Shield size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                        No assignments yet — will fall back to{' '}
                        <strong className="font-bold">{defaultProvider?.name}</strong>
                        {defaultModel ? ` · ${defaultModel.name}` : ''}.
                    </span>
                </div>
            )}

            {/* Table */}
            <div className="rounded-xl border border-surface-container overflow-hidden">
                <table className="w-full text-sm table-fixed">
                    <thead className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        <tr>
                            <th className="px-4 py-3 text-left">Provider</th>
                            <th className="px-4 py-3 text-left">Model</th>
                            <th className="px-1.5 py-3 text-left w-[84px]">Temp</th>
                            <th className="px-1.5 py-3 text-left w-[94px]">Max tokens</th>
                            {allowMultiple && (
                                <th className="px-1.5 py-3 text-center w-[92px]">Plan</th>
                            )}
                            {allowMultiple && (
                                <th className="px-1.5 py-3 text-center w-12">Default</th>
                            )}
                            <th className="px-1.5 py-3 text-right w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {draft.length === 0 && (
                            <tr>
                                <td
                                    colSpan={allowMultiple ? 7 : 5}
                                    className="px-4 py-8 text-center text-xs text-on-surface-variant"
                                >
                                    No assignments yet. Click{' '}
                                    <span className="font-bold">Add provider</span> below.
                                </td>
                            </tr>
                        )}
                        {draft.map((row, index) => {
                            const provider = providers.find(
                                (p) => p.id === row.ai_provider_id,
                            );
                            return (
                                <tr key={index} className="bg-surface-container-lowest">
                                    <td className="px-4 py-3 align-middle">
                                        <select
                                            value={row.ai_provider_id ?? ''}
                                            onChange={(e) =>
                                                update(index, {
                                                    ai_provider_id: e.target.value
                                                        ? parseInt(e.target.value)
                                                        : null,
                                                })
                                            }
                                            className={inputCls}
                                        >
                                            <option value="">Select provider…</option>
                                            {providers.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <select
                                            value={row.ai_provider_model_id ?? ''}
                                            disabled={!row.ai_provider_id}
                                            onChange={(e) =>
                                                update(index, {
                                                    ai_provider_model_id: e.target.value
                                                        ? parseInt(e.target.value)
                                                        : null,
                                                })
                                            }
                                            className={inputCls + ' disabled:opacity-50'}
                                        >
                                            <option value="">Select model…</option>
                                            {(provider?.models ?? []).map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-1.5 py-3 align-middle">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min={0}
                                            max={2}
                                            value={row.temperature}
                                            onChange={(e) =>
                                                update(index, {
                                                    temperature: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className={numericCls}
                                        />
                                    </td>
                                    <td className="px-1.5 py-3 align-middle">
                                        <input
                                            type="number"
                                            step="100"
                                            min={100}
                                            max={128000}
                                            value={row.max_tokens}
                                            onChange={(e) =>
                                                update(index, {
                                                    max_tokens: parseInt(e.target.value) || 0,
                                                })
                                            }
                                            className={numericCls}
                                        />
                                    </td>
                                    {allowMultiple && (
                                        <td className="px-1.5 py-3 align-middle text-center">
                                            <PlanTogglePill
                                                paidOnly={row.is_paid_only}
                                                onToggle={() =>
                                                    update(index, {
                                                        is_paid_only: !row.is_paid_only,
                                                    })
                                                }
                                            />
                                        </td>
                                    )}
                                    {allowMultiple && (
                                        <td className="px-1.5 py-3 align-middle text-center">
                                            <input
                                                type="radio"
                                                name={`default-${task.id}`}
                                                checked={row.is_default}
                                                onChange={() =>
                                                    update(index, { is_default: true })
                                                }
                                                className="w-4 h-4 accent-primary cursor-pointer"
                                                aria-label="Mark as default"
                                            />
                                        </td>
                                    )}
                                    <td className="px-1.5 py-3 align-middle text-right">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(index)}
                                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                            aria-label="Remove assignment"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    {allowMultiple && (
                        <button
                            type="button"
                            onClick={addRow}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-container-low border border-surface-container text-on-surface hover:bg-surface-container transition-colors"
                        >
                            <Plus size={14} /> Add provider
                        </button>
                    )}
                    {!allowMultiple && draft.length === 0 && (
                        <button
                            type="button"
                            onClick={addRow}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-container-low border border-surface-container text-on-surface hover:bg-surface-container transition-colors"
                        >
                            <Plus size={14} /> Add provider
                        </button>
                    )}
                    {requireDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                            <AlertTriangle size={12} />
                            Pick a default row
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {error && (
                        <span className="text-[11px] text-red-600">{error}</span>
                    )}
                    {dirty && !error && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                            Unsaved changes
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const inputCls =
    'w-full bg-surface-container-low border border-surface-container rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary/30';

// Numeric inputs sit in narrow columns: drop horizontal padding AND
// hide the native spin buttons (which steal ~16-20px of width and
// would otherwise overlap the displayed value). Users can still type
// the value or use up/down arrow keys to step it.
const numericCls =
    'w-full bg-surface-container-low border border-surface-container rounded-lg px-1.5 py-1.5 text-xs tabular-nums text-center focus:ring-2 focus:ring-primary/20 focus:border-primary/30 [appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none';

/**
 * Two-state pill toggle: "All users" (default) vs "Paid only".
 * Wired to the assignment's persisted `is_paid_only` flag — paid-only
 * rows are hidden from free users in the end-user model picker.
 */
function PlanTogglePill({
    paidOnly,
    onToggle,
}: {
    paidOnly: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            title={
                paidOnly
                    ? 'Only paid plan users can pick this model'
                    : 'Available to every user'
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold tracking-tight border transition-colors whitespace-nowrap ${
                paidOnly
                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/15'
                    : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:bg-surface-container'
            }`}
        >
            {paidOnly ? <Crown size={10} /> : <Users size={10} />}
            {paidOnly ? 'Paid only' : 'All users'}
        </button>
    );
}

/**
 * Build a clean draft array from the server-side task. Falls back to
 * a single empty row for tasks that have never been configured so
 * the table is immediately editable.
 */
function seed(task: AiContentTask): Assignment[] {
    if (task.assignments.length === 0) {
        return [
            {
                ai_provider_id: null,
                ai_provider_model_id: null,
                temperature: 0.7,
                max_tokens: 4096,
                is_default: true,
                is_paid_only: false,
                sort_order: 0,
            },
        ];
    }
    return task.assignments.map((a, i) => ({
        id: a.id,
        ai_provider_id: a.ai_provider_id,
        ai_provider_model_id: a.ai_provider_model_id,
        temperature: a.temperature,
        max_tokens: a.max_tokens,
        is_default: a.is_default,
        is_paid_only: a.is_paid_only,
        sort_order: a.sort_order ?? i,
    }));
}

function serialize(rows: Assignment[]): string {
    return JSON.stringify(
        rows.map((r) => ({
            p: r.ai_provider_id,
            m: r.ai_provider_model_id,
            t: r.temperature,
            x: r.max_tokens,
            d: r.is_default,
            f: r.is_paid_only,
            o: r.sort_order,
        })),
    );
}

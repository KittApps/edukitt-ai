import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import {
    Files,
    HardDrive,
    Save,
    SlidersHorizontal,
    Upload,
    type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { Toggle } from '@/Components/Admin/Shared';
import type { AiContentTask, TaskConfig, TaskConfigKey } from './types';

interface Props {
    task: AiContentTask;
}

interface ToggleRowSpec {
    key: TaskConfigKey;
    type: 'bool';
    icon: ComponentType<LucideProps>;
    label: string;
    description: string;
}

interface NumberRowSpec {
    key: TaskConfigKey;
    type: 'int';
    icon: ComponentType<LucideProps>;
    label: string;
    description: string;
    suffix?: string;
    min: number;
    max: number;
    step: number;
    /** Optional: only enable this row when another bool key is true. */
    enabledWhen?: TaskConfigKey;
}

type RowSpec = ToggleRowSpec | NumberRowSpec;

/**
 * Per-task admin Configuration tab body.
 *
 * Each task ships an `applicable_config` array from the controller —
 * we render only the rows whose key is in that list, in the order
 * declared below. Rows of type `int` can opt-in to being greyed out
 * unless a sibling boolean is ON (so the resources_max_* fields look
 * disabled while resources_enabled is OFF, but the values stay in
 * place for when the admin re-enables it).
 *
 * Adding a new task config key:
 *   1. add a column on `ai_content_tasks` + entry in the model's
 *      APPLICABLE_CONFIG map,
 *   2. add validation rule in SaveTaskConfigurationRequest,
 *   3. add a row spec below.
 */
const ROW_SPECS: RowSpec[] = [
    {
        key: 'personalize_enabled',
        type: 'bool',
        icon: SlidersHorizontal,
        label: 'Personalize options enabled',
        description:
            'When OFF, end users skip the Personalize step on this task. Saved options stay in place for when you re-enable it.',
    },
    {
        key: 'resources_enabled',
        type: 'bool',
        icon: Upload,
        label: 'Allow resources upload',
        description:
            'When ON, users can attach files (docs, PDFs, …) for the AI to consider while generating.',
    },
    {
        key: 'resources_max_files',
        type: 'int',
        icon: Files,
        label: 'Max files per upload',
        description: 'Upper bound on how many files a user can attach.',
        suffix: 'files',
        min: 1,
        max: 50,
        step: 1,
        enabledWhen: 'resources_enabled',
    },
    {
        key: 'resources_max_file_size_mb',
        type: 'int',
        icon: HardDrive,
        label: 'Max size per file',
        description: 'Reject files larger than this. Applied per file, not in total.',
        suffix: 'MB',
        min: 1,
        max: 200,
        step: 1,
        enabledWhen: 'resources_enabled',
    },
];

export default function TaskConfigurationCard({ task }: Props) {
    const applicable = useMemo(
        () => new Set<TaskConfigKey>(task.applicable_config),
        [task.applicable_config],
    );
    const visibleRows = useMemo(
        () => ROW_SPECS.filter((r) => applicable.has(r.key)),
        [applicable],
    );

    const [draft, setDraft] = useState<TaskConfig>(() => ({ ...task.config }));
    useEffect(() => {
        setDraft({ ...task.config });
    }, [task.id, task.config]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dirty = useMemo(
        () =>
            visibleRows.some(
                (r) => draft[r.key] !== task.config[r.key],
            ),
        [draft, task.config, visibleRows],
    );

    const update = <K extends TaskConfigKey>(key: K, value: TaskConfig[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            // Send only the keys the task actually exposes — matches
            // what the controller will accept anyway.
            const payload: Partial<TaskConfig> = {};
            for (const row of visibleRows) {
                payload[row.key] = draft[row.key] as never;
            }
            await axios.post(
                `/admin/settings/ai-content/${encodeURIComponent(task.key)}/configuration`,
                payload,
            );
            router.reload({ only: ['tasks'] });
        } catch (e: unknown) {
            const message =
                axios.isAxiosError(e) && e.response?.data?.message
                    ? String(e.response.data.message)
                    : 'Failed to save. Please try again.';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (visibleRows.length === 0) {
        return (
            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-6 text-center text-xs text-on-surface-variant">
                No configuration options for this task.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                {visibleRows.map((row) => {
                    const isEnabled =
                        row.type === 'int' && row.enabledWhen
                            ? Boolean(draft[row.enabledWhen])
                            : true;
                    return (
                        <ConfigRow
                            key={row.key}
                            row={row}
                            value={draft[row.key]}
                            disabled={!isEnabled}
                            onChange={(v) => update(row.key, v as never)}
                        />
                    );
                })}
            </div>

            <div className="flex items-center justify-end gap-3">
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
                    disabled={!dirty || saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Save size={14} /> {saving ? 'Saving\u2026' : 'Save configuration'}
                </button>
            </div>
        </div>
    );
}

function ConfigRow({
    row,
    value,
    disabled,
    onChange,
}: {
    row: RowSpec;
    value: TaskConfig[TaskConfigKey];
    disabled: boolean;
    onChange: (next: boolean | number) => void;
}) {
    const Icon = row.icon;
    return (
        <label
            htmlFor={`task-cfg-${row.key}`}
            className={`flex items-start gap-3 px-4 py-4 transition-opacity ${
                disabled ? 'opacity-50' : 'cursor-pointer'
            }`}
        >
            <span className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Icon size={18} />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">{row.label}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                    {row.description}
                </p>
            </div>
            <span className="flex-shrink-0 pt-0.5">
                {row.type === 'bool' ? (
                    <Toggle
                        id={`task-cfg-${row.key}`}
                        checked={Boolean(value)}
                        onChange={(v) => onChange(v)}
                        disabled={disabled}
                    />
                ) : (
                    <span className="inline-flex items-center gap-1.5">
                        <input
                            id={`task-cfg-${row.key}`}
                            type="number"
                            min={row.min}
                            max={row.max}
                            step={row.step}
                            value={Number(value)}
                            disabled={disabled}
                            onChange={(e) => {
                                const raw = parseInt(e.target.value, 10);
                                if (Number.isNaN(raw)) return;
                                const clamped = Math.max(
                                    row.min,
                                    Math.min(row.max, raw),
                                );
                                onChange(clamped);
                            }}
                            className="w-20 bg-surface-container-low border border-surface-container rounded-lg px-2 py-1.5 text-xs tabular-nums text-center focus:ring-2 focus:ring-primary/20 focus:border-primary/30 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {row.suffix && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                {row.suffix}
                            </span>
                        )}
                    </span>
                )}
            </span>
        </label>
    );
}

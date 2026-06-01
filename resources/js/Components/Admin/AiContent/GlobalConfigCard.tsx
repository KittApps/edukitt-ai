import { useForm } from '@inertiajs/react';
import { Cpu, Globe, Save, SplitSquareHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Toggle } from '@/Components/Admin/Shared';
import type { SupportedLanguage } from './SupportedLanguagesCard';

export interface GlobalConfig {
    user_can_select_model: boolean;
    merge_course_generation: boolean;
    show_language_selector: boolean;
    supported_languages: SupportedLanguage[];
}

interface Props {
    initial: GlobalConfig;
}

type ToggleKey =
    | 'user_can_select_model'
    | 'merge_course_generation'
    | 'show_language_selector';

interface ToggleRow {
    key: ToggleKey;
    icon: ReactNode;
    label: string;
    description: string;
    /**
     * When set, the row reads as ON whenever the named sibling key
     * is ON, and the user can't change it from the UI. Used to lock
     * `merge_course_generation` while `user_can_select_model` is ON,
     * since the model picker already implies the merged sidebar.
     */
    forceOnWhen?: ToggleKey;
    forceOnHint?: string;
}

/**
 * Global behaviour switches for the AI content flows. Lives on the
 * Default task's "Configuration" sub-tab because these settings are
 * task-agnostic — they describe what the end-user generation form is
 * allowed to expose, not which model the resolver picks.
 *
 * Mirrors the row-of-toggles design used on
 * /admin/settings/queue → Jobs so the admin settings area stays
 * visually consistent. The supported-languages editor is a separate
 * "Supported Languages" sub-tab — keeping them apart means each
 * concern has its own save button and the language list isn't
 * accidentally re-saved every time a toggle is flipped.
 */
export default function GlobalConfigCard({ initial }: Props) {
    const form = useForm<
        Pick<
            GlobalConfig,
            | 'user_can_select_model'
            | 'merge_course_generation'
            | 'show_language_selector'
        >
    >({
        user_can_select_model: initial.user_can_select_model,
        merge_course_generation: initial.merge_course_generation,
        show_language_selector: initial.show_language_selector,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/ai-content/global-config', {
            preserveScroll: true,
        });
    };

    const rows: ToggleRow[] = [
        {
            key: 'user_can_select_model',
            icon: <Cpu size={18} />,
            label: 'Let users pick the AI model',
            description:
                'When ON, users pick from the provider/model rows you allowed per task. When OFF, every generation uses each task\u2019s default assignment.',
        },
        {
            key: 'merge_course_generation',
            icon: <SplitSquareHorizontal size={18} />,
            label: 'Combine Course Outline + Course Lesson',
            description:
                'Collapses both tasks into one \u201CCourse Generation\u201D entry in the sidebar. Forced ON while \u201CLet users pick the AI model\u201D is enabled.',
            forceOnWhen: 'user_can_select_model',
            forceOnHint:
                'Disabled because \u201CLet users pick the AI model\u201D already merges both tasks.',
        },
        {
            key: 'show_language_selector',
            icon: <Globe size={18} />,
            label: 'Show language selector',
            description:
                'When ON, end users can pick the output language from the list in the Supported Languages tab. When OFF, generations follow the platform\u2019s default language.',
        },
    ];

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                {rows.map((row) => {
                    const isForcedOn =
                        row.forceOnWhen !== undefined && form.data[row.forceOnWhen];
                    // While forced ON we render the toggle in the ON
                    // position regardless of the stored value so the
                    // admin sees the *effective* state. The stored
                    // value is preserved untouched and resurfaces the
                    // moment the parent toggle flips back to OFF.
                    const displayedChecked = isForcedOn ? true : form.data[row.key];
                    return (
                        <label
                            key={row.key}
                            htmlFor={`ai-content-cfg-${row.key}`}
                            title={isForcedOn ? row.forceOnHint : undefined}
                            className={`flex items-start gap-3 px-4 py-4 transition-opacity ${
                                isForcedOn
                                    ? 'opacity-60 cursor-not-allowed'
                                    : 'cursor-pointer'
                            }`}
                        >
                            <span className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                                {row.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-on-surface">
                                    {row.label}
                                </p>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                    {row.description}
                                </p>
                            </div>
                            <span className="flex-shrink-0 pt-0.5">
                                <Toggle
                                    id={`ai-content-cfg-${row.key}`}
                                    checked={displayedChecked}
                                    onChange={(v) =>
                                        !isForcedOn && form.setData(row.key, v)
                                    }
                                    disabled={isForcedOn}
                                />
                            </span>
                        </label>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Save size={14} /> {form.processing ? 'Saving\u2026' : 'Save configuration'}
                </button>
            </div>
        </form>
    );
}

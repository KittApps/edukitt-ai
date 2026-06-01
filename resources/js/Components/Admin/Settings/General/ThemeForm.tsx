import { useForm } from '@inertiajs/react';
import { Moon, Palette, Save, Sun } from 'lucide-react';
import { useMemo } from 'react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';

export interface ThemeRow {
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
    is_dark: boolean;
    position: number;
}

export interface ThemeBlock {
    allow_user_selection: boolean;
    default_key: string;
    themes: ThemeRow[];
}

interface Props {
    initial: ThemeBlock;
}

interface FormShape {
    allow_user_selection: boolean;
    default_key: string;
    themes: { key: string; enabled: boolean }[];
}

export default function ThemeForm({ initial }: Props) {
    const t = useT();

    const initialThemes = useMemo(
        () => initial.themes.map((theme) => ({ key: theme.key, enabled: theme.enabled })),
        [initial.themes],
    );

    const form = useForm<FormShape>({
        allow_user_selection: initial.allow_user_selection,
        default_key: initial.default_key,
        themes: initialThemes,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general/theme', {
            preserveScroll: true,
        });
    };

    const setRowEnabled = (key: string, enabled: boolean) => {
        form.setData(
            'themes',
            form.data.themes.map((row) =>
                row.key === key ? { ...row, enabled } : row,
            ),
        );
    };

    return (
        <EditorPane
            icon={<Palette size={22} />}
            title={t('admin.general.theme.title', 'Themes')}
            description={t(
                'admin.general.theme.description',
                'Pick which app-side themes are available, set the system default, and choose whether users can override it.',
            )}
            onSubmit={submit}
        >
            {/* Master toggle: allow end users to pick their own theme */}
            <div className="rounded-xl border border-surface-container">
                <label
                    htmlFor="theme-allow-user-selection"
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                            {t(
                                'admin.general.theme.allow_user.label',
                                'Allow users to choose their own theme',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'admin.general.theme.allow_user.description',
                                'When enabled, signed-in users see a theme picker in the header and may pick any enabled theme. Their choice persists per account.',
                            )}
                        </p>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                        <Toggle
                            id="theme-allow-user-selection"
                            checked={form.data.allow_user_selection}
                            onChange={(v) =>
                                form.setData('allow_user_selection', v)
                            }
                        />
                    </span>
                </label>
            </div>

            {/* Per-theme rows */}
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                    {t('admin.general.theme.list.label', 'Available themes')}
                </p>
                <div className="rounded-xl border border-surface-container divide-y divide-surface-container overflow-hidden">
                    {initial.themes.map((theme) => {
                        const row = form.data.themes.find(
                            (r) => r.key === theme.key,
                        );
                        const enabled = row?.enabled ?? false;
                        const isDefault = form.data.default_key === theme.key;
                        // Don't let admin disable the currently-default theme
                        // — they need to pick a different default first,
                        // otherwise the app would have no theme to fall back to.
                        const disableEnableToggle = isDefault;
                        return (
                            <div
                                key={theme.key}
                                className="flex items-center gap-3 px-4 py-4"
                            >
                                <div
                                    className={`p-2 rounded-lg flex-shrink-0 ${
                                        theme.is_dark
                                            ? 'bg-on-surface text-surface-container-lowest'
                                            : 'bg-primary/10 text-primary'
                                    }`}
                                >
                                    {theme.is_dark ? (
                                        <Moon size={16} />
                                    ) : (
                                        <Sun size={16} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-on-surface truncate">
                                            {theme.name}
                                        </p>
                                        {isDefault && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                                {t(
                                                    'admin.general.theme.list.default_badge',
                                                    'Default',
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {theme.description && (
                                        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                                            {theme.description}
                                        </p>
                                    )}
                                </div>

                                <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant cursor-pointer flex-shrink-0">
                                    <input
                                        type="radio"
                                        name="theme-default-key"
                                        checked={isDefault}
                                        // The default radio is only meaningful
                                        // for themes that are currently enabled.
                                        disabled={!enabled}
                                        onChange={() =>
                                            form.setData(
                                                'default_key',
                                                theme.key,
                                            )
                                        }
                                        className="text-primary focus:ring-primary/40"
                                    />
                                    {t(
                                        'admin.general.theme.list.default',
                                        'Default',
                                    )}
                                </label>

                                <span
                                    className="flex-shrink-0"
                                    title={
                                        disableEnableToggle
                                            ? t(
                                                  'admin.general.theme.list.cannot_disable_default',
                                                  'Pick a different default before disabling this theme.',
                                              )
                                            : undefined
                                    }
                                >
                                    <Toggle
                                        checked={enabled}
                                        disabled={disableEnableToggle}
                                        onChange={(v) =>
                                            setRowEnabled(theme.key, v)
                                        }
                                    />
                                </span>
                            </div>
                        );
                    })}
                </div>
                {form.errors.default_key && (
                    <p className="text-xs text-red-600 mt-2">
                        {form.errors.default_key}
                    </p>
                )}
                {form.errors.themes && (
                    <p className="text-xs text-red-600 mt-2">
                        {form.errors.themes as unknown as string}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t('admin.general.theme.save', 'Save theme settings')}
            </button>
        </EditorPane>
    );
}

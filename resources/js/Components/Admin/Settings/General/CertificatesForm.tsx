import { useForm } from '@inertiajs/react';
import { Award, RotateCcw, Save } from 'lucide-react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';
import { inputClasses } from './styles';

export interface CertificatesBlock {
    enabled: boolean;
    primary_color: string | null;
    theme_default_color: string;
    effective_color: string;
    background_color: string;
    default_background_color: string;
}

interface Props {
    initial: CertificatesBlock;
}

interface FormShape {
    enabled: boolean;
    primary_color: string;
    background_color: string;
}

/**
 * Admin form for the global Certificates settings.
 *   - `enabled` flips the feature off everywhere (routes 404, sidebar
 *     and course view hide certificate UI).
 *   - `primary_color` is an optional override; when blank the runtime
 *     derives the accent from the active site theme so cert design
 *     tracks theme changes for free.
 */
export default function CertificatesForm({ initial }: Props) {
    const t = useT();
    const form = useForm<FormShape>({
        enabled: initial.enabled,
        primary_color: initial.primary_color ?? '',
        background_color: initial.background_color,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general/certificates', {
            preserveScroll: true,
        });
    };

    const usingTheme = form.data.primary_color.trim() === '';
    const previewColor = usingTheme
        ? initial.theme_default_color
        : normalizeHex(form.data.primary_color) ?? initial.theme_default_color;
    const previewBackground =
        normalizeHex(form.data.background_color) ??
        initial.default_background_color;

    return (
        <EditorPane
            icon={<Award size={22} />}
            title={t('admin.general.certificates.title', 'Certificates')}
            description={t(
                'admin.general.certificates.description',
                'Master switch for the course certificates feature and styling used on the learner certificate page (including browser print).',
            )}
            onSubmit={submit}
        >
            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                <label
                    htmlFor="certificates-enabled"
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                            {t(
                                'admin.general.certificates.enable.label',
                                'Enable certificates',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'admin.general.certificates.enable.description',
                                'When off, the certificate pages are inaccessible and the sidebar / course view stop showing certificate UI.',
                            )}
                        </p>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                        <Toggle
                            id="certificates-enabled"
                            checked={form.data.enabled}
                            onChange={(v) => form.setData('enabled', v)}
                        />
                    </span>
                </label>
            </div>

            <div>
                <label
                    htmlFor="certificates-color"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t(
                        'admin.general.certificates.color.label',
                        'Certificate primary color',
                    )}
                </label>
                <div className="flex items-stretch gap-3">
                    <div className="relative flex-shrink-0">
                        <input
                            type="color"
                            value={previewColor}
                            onChange={(e) =>
                                form.setData('primary_color', e.target.value)
                            }
                            className="w-12 h-full rounded-xl border border-surface-container cursor-pointer bg-surface-container-low"
                            aria-label={t(
                                'admin.general.certificates.color.picker_aria',
                                'Color picker',
                            )}
                        />
                    </div>
                    <input
                        id="certificates-color"
                        type="text"
                        value={form.data.primary_color}
                        onChange={(e) =>
                            form.setData('primary_color', e.target.value)
                        }
                        placeholder={initial.theme_default_color}
                        autoComplete="off"
                        spellCheck={false}
                        className={inputClasses + ' flex-1'}
                    />
                    {!usingTheme && (
                        <button
                            type="button"
                            onClick={() => form.setData('primary_color', '')}
                            className="inline-flex items-center gap-1.5 px-3 rounded-xl border border-surface-container text-xs font-bold text-on-surface-variant hover:text-primary hover:border-primary/40 transition-all"
                            title={t(
                                'admin.general.certificates.color.reset',
                                'Use site theme color',
                            )}
                        >
                            <RotateCcw size={13} />
                            {t(
                                'admin.general.certificates.color.reset',
                                'Use theme',
                            )}
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1.5">
                    {usingTheme
                        ? t(
                              'admin.general.certificates.color.using_theme',
                              'Following the active site theme ({color}). Pick a color to override.',
                              { color: initial.theme_default_color },
                          )
                        : t(
                              'admin.general.certificates.color.override',
                              'Accent color on the learner certificate page and this preview.',
                          )}
                </p>
                {form.errors.primary_color && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.primary_color}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="certificates-bg"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t(
                        'admin.general.certificates.background.label',
                        'Certificate background color',
                    )}
                </label>
                <div className="flex items-stretch gap-3">
                    <div className="relative flex-shrink-0">
                        <input
                            type="color"
                            value={previewBackground}
                            onChange={(e) =>
                                form.setData(
                                    'background_color',
                                    e.target.value,
                                )
                            }
                            className="w-12 h-full rounded-xl border border-surface-container cursor-pointer bg-surface-container-low"
                            aria-label={t(
                                'admin.general.certificates.background.picker_aria',
                                'Background color picker',
                            )}
                        />
                    </div>
                    <input
                        id="certificates-bg"
                        type="text"
                        value={form.data.background_color}
                        onChange={(e) =>
                            form.setData('background_color', e.target.value)
                        }
                        placeholder={initial.default_background_color}
                        autoComplete="off"
                        spellCheck={false}
                        className={inputClasses + ' flex-1'}
                    />
                    {form.data.background_color.toLowerCase() !==
                        initial.default_background_color.toLowerCase() && (
                        <button
                            type="button"
                            onClick={() =>
                                form.setData(
                                    'background_color',
                                    initial.default_background_color,
                                )
                            }
                            className="inline-flex items-center gap-1.5 px-3 rounded-xl border border-surface-container text-xs font-bold text-on-surface-variant hover:text-primary hover:border-primary/40 transition-all"
                            title={t(
                                'admin.general.certificates.background.reset',
                                'Reset to white',
                            )}
                        >
                            <RotateCcw size={13} />
                            {t(
                                'admin.general.certificates.background.reset_short',
                                'Reset',
                            )}
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1.5">
                    {t(
                        'admin.general.certificates.background.hint',
                        'Background on the learner certificate page and this preview.',
                    )}
                </p>
                {form.errors.background_color && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.background_color}
                    </p>
                )}
            </div>

            <CertificatePreview
                color={previewColor}
                background={previewBackground}
                followingTheme={usingTheme}
            />

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t(
                    'admin.general.certificates.save',
                    'Save certificate settings',
                )}
            </button>
        </EditorPane>
    );
}

interface PreviewProps {
    color: string;
    background: string;
    followingTheme: boolean;
}

function CertificatePreview({
    color,
    background,
    followingTheme,
}: PreviewProps) {
    const t = useT();

    return (
        <div className="rounded-xl border border-surface-container bg-surface-container-low overflow-hidden">
            <div className="px-4 py-2 border-b border-surface-container flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {t(
                        'admin.general.certificates.preview.kicker',
                        'Live preview',
                    )}
                </p>
                {followingTheme && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {t(
                            'admin.general.certificates.preview.theme_hint',
                            'Tracks theme',
                        )}
                    </span>
                )}
            </div>
            <div
                className="p-6"
                style={{ fontFamily: 'serif', background }}
            >
                <div
                    className="rounded-2xl text-center p-6"
                    style={{ border: `3px solid ${color}` }}
                >
                    <div
                        className="text-[9px] font-bold tracking-[6px] uppercase mb-3"
                        style={{ color }}
                    >
                        ★ Certificate of Completion ★
                    </div>
                    <p className="italic text-[11px] text-neutral-500">
                        This certifies that
                    </p>
                    <p className="text-xl font-bold text-neutral-900 my-1">
                        Jane Doe
                    </p>
                    <div
                        className="h-px w-12 mx-auto my-2 opacity-50"
                        style={{ background: color }}
                    />
                    <p className="text-[10px] text-neutral-500">
                        has successfully completed the course
                    </p>
                    <p
                        className="text-base font-semibold mt-1"
                        style={{ color }}
                    >
                        AI for Educators
                    </p>
                </div>
            </div>
        </div>
    );
}

function normalizeHex(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
        const [, r, g, b] = withHash;
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return null;
}

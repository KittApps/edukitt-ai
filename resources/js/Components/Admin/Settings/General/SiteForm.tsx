import { useForm } from '@inertiajs/react';
import { Globe, Languages, Save } from 'lucide-react';
import { Link } from '@inertiajs/react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';
import { inputClasses } from './styles';

export interface SiteBlock {
    title: string | null;
    description: string | null;
    support_enabled: boolean;
    language_switcher_enabled: boolean;
}

interface LanguageOption {
    code: string;
    name: string;
    native_name: string;
    flag: string | null;
    direction: 'ltr' | 'rtl';
    /** True for the translation source row (typically English); not tied to visitor default */
    is_translation_base?: boolean;
}

interface LanguagesBlock {
    options: LanguageOption[];
    current_default: string | null;
}

interface Props {
    initial: SiteBlock;
    languages: LanguagesBlock;
}

interface FormShape {
    site_title: string;
    site_description: string;
    support_enabled: boolean;
    language_switcher_enabled: boolean;
    default_language_code: string;
}

export default function SiteForm({ initial, languages }: Props) {
    const t = useT();
    const form = useForm<FormShape>({
        site_title: initial.title ?? '',
        site_description: initial.description ?? '',
        support_enabled: initial.support_enabled,
        language_switcher_enabled: initial.language_switcher_enabled,
        default_language_code: languages.current_default ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general', { preserveScroll: true });
    };

    return (
        <EditorPane
            icon={<Globe size={22} />}
            title={t('admin.general.site.title', 'Site')}
            description={t(
                'admin.general.site.description',
                'The home page <title> tag and meta description shown in search results and link previews.',
            )}
            onSubmit={submit}
        >
            <div>
                <label
                    htmlFor="site-title"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.general.site.title_field', 'Site title')}
                </label>
                <input
                    id="site-title"
                    type="text"
                    value={form.data.site_title}
                    onChange={(e) => form.setData('site_title', e.target.value)}
                    placeholder={t(
                        'admin.general.site.title_placeholder',
                        'EduKitt — AI-powered learning',
                    )}
                    maxLength={160}
                    className={inputClasses}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {form.data.site_title.length} / 160
                </p>
                {form.errors.site_title && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.site_title}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="site-description"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.general.site.description_field', 'Site description')}
                </label>
                <textarea
                    id="site-description"
                    value={form.data.site_description}
                    onChange={(e) =>
                        form.setData('site_description', e.target.value)
                    }
                    placeholder={t(
                        'admin.general.site.description_placeholder',
                        'A short summary shown in search results and link previews.',
                    )}
                    maxLength={500}
                    className={`${inputClasses} min-h-28 resize-y`}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {form.data.site_description.length} / 500
                </p>
                {form.errors.site_description && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.site_description}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="site-default-language"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t(
                        'admin.general.site.default_language.label',
                        'Default site language',
                    )}
                </label>
                {languages.options.length === 0 ? (
                    <EmptyLanguagesHint />
                ) : (
                    <div className="relative">
                        <Languages
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                        />
                        <select
                            id="site-default-language"
                            value={form.data.default_language_code}
                            onChange={(e) =>
                                form.setData(
                                    'default_language_code',
                                    e.target.value,
                                )
                            }
                            className={`${inputClasses} pl-10 pr-8 appearance-none`}
                        >
                            {languages.options.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag ? `${lang.flag} ` : ''}
                                    {lang.native_name} — {lang.name} (
                                    {lang.code.toUpperCase()})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {t(
                        'admin.general.site.default_language.hint',
                        'Manage languages under {link}.',
                        { link: 'Settings → Localization' },
                    )}{' '}
                    <Link
                        href="/admin/settings/localization"
                        className="font-bold text-primary hover:underline"
                    >
                        {t(
                            'admin.general.site.default_language.manage_link',
                            'manage languages',
                        )}
                    </Link>
                </p>
                {form.errors.default_language_code && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.default_language_code}
                    </p>
                )}
            </div>

            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                <label
                    htmlFor="site-support-enabled"
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                            {t(
                                'admin.general.site.support_enabled.label',
                                'Enable Help & Support page',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'admin.general.site.support_enabled.description',
                                'Show a public Help & Support page with your FAQs. When off, the page and its menu links are hidden.',
                            )}
                        </p>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                        <Toggle
                            id="site-support-enabled"
                            checked={form.data.support_enabled}
                            onChange={(v) => form.setData('support_enabled', v)}
                        />
                    </span>
                </label>

                <label
                    htmlFor="site-language-switcher-enabled"
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                            {t(
                                'admin.general.site.language_switcher_enabled.label',
                                'Enable language selector',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'admin.general.site.language_switcher_enabled.description',
                                'Let visitors switch the interface language from the site header. When off, the selector is hidden across the public and app shells.',
                            )}
                        </p>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                        <Toggle
                            id="site-language-switcher-enabled"
                            checked={form.data.language_switcher_enabled}
                            onChange={(v) =>
                                form.setData('language_switcher_enabled', v)
                            }
                        />
                    </span>
                </label>
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t('admin.general.site.save', 'Save site settings')}
            </button>
        </EditorPane>
    );
}

function EmptyLanguagesHint() {
    const t = useT();

    return (
        <div className="rounded-xl border border-dashed border-surface-container px-4 py-3 text-xs text-on-surface-variant">
            {t(
                'admin.general.site.default_language.empty',
                'No active languages yet. Add one under',
            )}{' '}
            <Link
                href="/admin/settings/localization"
                className="font-bold text-primary hover:underline"
            >
                {t(
                    'admin.general.site.default_language.empty_link',
                    'Settings → Localization',
                )}
            </Link>
            .
        </div>
    );
}

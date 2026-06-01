import { useForm } from '@inertiajs/react';
import { Cookie, Save } from 'lucide-react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';
import { inputClasses } from './styles';

export interface GdprBlock {
    enabled: boolean;
    banner_message: string;
    accept_label: string;
    decline_label: string;
    policy_url: string | null;
    policy_label: string;
}

interface Props {
    initial: GdprBlock;
}

interface FormShape {
    enabled: boolean;
    banner_message: string;
    accept_label: string;
    decline_label: string;
    policy_url: string;
    policy_label: string;
}

export default function GdprForm({ initial }: Props) {
    const t = useT();
    const form = useForm<FormShape>({
        enabled: initial.enabled,
        banner_message: initial.banner_message,
        accept_label: initial.accept_label,
        decline_label: initial.decline_label,
        policy_url: initial.policy_url ?? '',
        policy_label: initial.policy_label,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general/gdpr', { preserveScroll: true });
    };

    return (
        <EditorPane
            icon={<Cookie size={22} />}
            title={t('admin.general.gdpr.title', 'GDPR / Cookie banner')}
            description={t(
                'admin.general.gdpr.description',
                'Show a cookie-consent banner on every public page. Visitors can accept or decline; the choice is remembered in their browser.',
            )}
            onSubmit={submit}
        >
            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                <label
                    htmlFor="gdpr-enabled"
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                            {t(
                                'admin.general.gdpr.enable.label',
                                'Show cookie consent banner',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'admin.general.gdpr.enable.description',
                                'Banner appears at the bottom of public pages until the visitor accepts or declines. Disable to hide it everywhere.',
                            )}
                        </p>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                        <Toggle
                            id="gdpr-enabled"
                            checked={form.data.enabled}
                            onChange={(v) => form.setData('enabled', v)}
                        />
                    </span>
                </label>
            </div>

            <div>
                <label
                    htmlFor="gdpr-banner-message"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t(
                        'admin.general.gdpr.message.label',
                        'Banner message',
                    )}
                </label>
                <textarea
                    id="gdpr-banner-message"
                    value={form.data.banner_message}
                    onChange={(e) =>
                        form.setData('banner_message', e.target.value)
                    }
                    maxLength={600}
                    className={`${inputClasses} min-h-24 resize-y`}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {form.data.banner_message.length} / 600
                </p>
                {form.errors.banner_message && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.banner_message}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="gdpr-accept-label"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t(
                            'admin.general.gdpr.accept_label.label',
                            'Accept button text',
                        )}
                    </label>
                    <input
                        id="gdpr-accept-label"
                        type="text"
                        value={form.data.accept_label}
                        onChange={(e) =>
                            form.setData('accept_label', e.target.value)
                        }
                        maxLength={60}
                        className={inputClasses}
                    />
                    {form.errors.accept_label && (
                        <p className="text-xs text-red-600 mt-1">
                            {form.errors.accept_label}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="gdpr-decline-label"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t(
                            'admin.general.gdpr.decline_label.label',
                            'Decline button text',
                        )}
                    </label>
                    <input
                        id="gdpr-decline-label"
                        type="text"
                        value={form.data.decline_label}
                        onChange={(e) =>
                            form.setData('decline_label', e.target.value)
                        }
                        maxLength={60}
                        className={inputClasses}
                    />
                    {form.errors.decline_label && (
                        <p className="text-xs text-red-600 mt-1">
                            {form.errors.decline_label}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                <div>
                    <label
                        htmlFor="gdpr-policy-url"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t(
                            'admin.general.gdpr.policy_url.label',
                            'Policy link URL',
                        )}
                    </label>
                    <input
                        id="gdpr-policy-url"
                        type="text"
                        value={form.data.policy_url}
                        onChange={(e) =>
                            form.setData('policy_url', e.target.value)
                        }
                        placeholder="/p/privacy"
                        autoComplete="off"
                        spellCheck={false}
                        className={inputClasses}
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">
                        {t(
                            'admin.general.gdpr.policy_url.hint',
                            'Optional. Path or absolute URL to your cookie / privacy policy.',
                        )}
                    </p>
                    {form.errors.policy_url && (
                        <p className="text-xs text-red-600 mt-1">
                            {form.errors.policy_url}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="gdpr-policy-label"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t(
                            'admin.general.gdpr.policy_label.label',
                            'Policy link text',
                        )}
                    </label>
                    <input
                        id="gdpr-policy-label"
                        type="text"
                        value={form.data.policy_label}
                        onChange={(e) =>
                            form.setData('policy_label', e.target.value)
                        }
                        maxLength={60}
                        className={inputClasses}
                    />
                    {form.errors.policy_label && (
                        <p className="text-xs text-red-600 mt-1">
                            {form.errors.policy_label}
                        </p>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t('admin.general.gdpr.save', 'Save GDPR settings')}
            </button>
        </EditorPane>
    );
}

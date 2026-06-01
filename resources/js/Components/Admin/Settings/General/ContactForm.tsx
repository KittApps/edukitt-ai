import { useForm } from '@inertiajs/react';
import { Mail, Save } from 'lucide-react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';
import { inputClasses } from './styles';

export interface ContactBlock {
    enabled: boolean;
    recipient_email: string | null;
    effective_recipient: string | null;
}

interface Props {
    initial: ContactBlock;
}

interface FormShape {
    enabled: boolean;
    recipient_email: string;
}

export default function ContactForm({ initial }: Props) {
    const t = useT();
    const form = useForm<FormShape>({
        enabled: initial.enabled,
        recipient_email: initial.recipient_email ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general/contact', { preserveScroll: true });
    };

    const fallbackEmail =
        initial.recipient_email === null && initial.effective_recipient
            ? initial.effective_recipient
            : null;

    return (
        <EditorPane
            icon={<Mail size={22} />}
            title={t('admin.general.contact.title', 'Contact')}
            description={t(
                'admin.general.contact.description',
                'Public contact form on /contact. Submissions are emailed to the address below.',
            )}
            onSubmit={submit}
        >
            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                <label
                    htmlFor="contact-enabled"
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                            {t(
                                'admin.general.contact.enable.label',
                                'Enable contact page',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'admin.general.contact.enable.description',
                                'Let visitors reach out through a public contact form. When off, the page and its menu link are hidden.',
                            )}
                        </p>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                        <Toggle
                            id="contact-enabled"
                            checked={form.data.enabled}
                            onChange={(v) => form.setData('enabled', v)}
                        />
                    </span>
                </label>
            </div>

            <div>
                <label
                    htmlFor="contact-recipient"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t(
                        'admin.general.contact.recipient.label',
                        'Send submissions to',
                    )}
                </label>
                <input
                    id="contact-recipient"
                    type="email"
                    value={form.data.recipient_email}
                    onChange={(e) =>
                        form.setData('recipient_email', e.target.value)
                    }
                    placeholder={
                        fallbackEmail
                            ? `${fallbackEmail} ` +
                              t(
                                  'admin.general.contact.recipient.fallback_hint',
                                  '(default From address)',
                              )
                            : 'admin@example.com'
                    }
                    autoComplete="off"
                    spellCheck={false}
                    className={inputClasses}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {t(
                        'admin.general.contact.recipient.hint',
                        'Email address that receives contact form submissions. Leave blank to use the default From address configured under Email settings.',
                    )}
                </p>
                {form.errors.recipient_email && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.recipient_email}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t('admin.general.contact.save', 'Save contact settings')}
            </button>
        </EditorPane>
    );
}

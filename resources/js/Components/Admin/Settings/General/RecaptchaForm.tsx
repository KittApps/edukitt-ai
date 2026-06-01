import { useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    ExternalLink,
    Info,
    Save,
    ShieldCheck,
} from 'lucide-react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';
import { inputClasses } from './styles';

export interface RecaptchaBlock {
    enabled: boolean;
    site_key: string | null;
    secret_set: boolean;
    effective: boolean;
}

interface Props {
    initial: RecaptchaBlock;
}

interface FormShape {
    enabled: boolean;
    site_key: string;
    secret_key: string;
}

const PROTECTED_PAGES = [
    { label: 'Sign in', path: '/login' },
    { label: 'Register', path: '/register' },
    { label: 'Forgot password', path: '/forgot-password' },
    { label: 'Reset password', path: '/reset-password' },
    { label: 'Contact', path: '/contact' },
];

export default function RecaptchaForm({ initial }: Props) {
    const t = useT();
    const form = useForm<FormShape>({
        enabled: initial.enabled,
        site_key: initial.site_key ?? '',
        secret_key: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general/recaptcha', {
            preserveScroll: true,
            onSuccess: () => form.setData('secret_key', ''),
        });
    };

    const effective = form.data.enabled && form.data.site_key.trim() !== '' && (initial.secret_set || form.data.secret_key.trim() !== '');

    return (
        <EditorPane
            icon={<ShieldCheck size={22} />}
            title={t('admin.general.recaptcha.title', 'reCAPTCHA')}
            description={t(
                'admin.general.recaptcha.description',
                'Protect auth forms with Google reCAPTCHA v2.',
            )}
            onSubmit={submit}
        >
            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                <label
                    htmlFor="recaptcha-enabled"
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                            {t(
                                'admin.general.recaptcha.enable.label',
                                'Enable reCAPTCHA',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'admin.general.recaptcha.enable.description',
                                'When on, the v2 challenge is required on every auth form below. Disable to skip the widget everywhere.',
                            )}
                        </p>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                        <Toggle
                            id="recaptcha-enabled"
                            checked={form.data.enabled}
                            onChange={(v) => form.setData('enabled', v)}
                        />
                    </span>
                </label>
            </div>

            <div>
                <label
                    htmlFor="recaptcha-site-key"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.general.recaptcha.site_key.label', 'Site key')}
                </label>
                <input
                    id="recaptcha-site-key"
                    type="text"
                    value={form.data.site_key}
                    onChange={(e) => form.setData('site_key', e.target.value)}
                    placeholder="6Lc..."
                    autoComplete="off"
                    spellCheck={false}
                    className={inputClasses}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {t(
                        'admin.general.recaptcha.site_key.hint',
                        'Public key embedded in the widget on the auth pages.',
                    )}
                </p>
                {form.errors.site_key && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.site_key}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="recaptcha-secret-key"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t(
                        'admin.general.recaptcha.secret_key.label',
                        'Secret key',
                    )}
                </label>
                <input
                    id="recaptcha-secret-key"
                    type="password"
                    value={form.data.secret_key}
                    onChange={(e) => form.setData('secret_key', e.target.value)}
                    placeholder={
                        initial.secret_set
                            ? '•••••••••• ' +
                              t(
                                  'admin.general.recaptcha.secret_key.saved_hint',
                                  '(saved — leave blank to keep)',
                              )
                            : t(
                                  'admin.general.recaptcha.secret_key.placeholder',
                                  'Paste the server-side secret',
                              )
                    }
                    autoComplete="off"
                    spellCheck={false}
                    className={inputClasses}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {t(
                        'admin.general.recaptcha.secret_key.hint',
                        'Stored encrypted at rest. Used server-side to verify each challenge with Google.',
                    )}
                </p>
                {form.errors.secret_key && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.secret_key}
                    </p>
                )}
            </div>

            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 px-4 py-4 space-y-3">
                <div className="flex items-start gap-2.5">
                    <Info
                        size={16}
                        className="flex-shrink-0 mt-0.5 text-on-surface-variant"
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface">
                            {t(
                                'admin.general.recaptcha.where.title',
                                'Where reCAPTCHA appears',
                            )}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {effective
                                ? t(
                                      'admin.general.recaptcha.where.on',
                                      'The challenge is required on these forms:',
                                  )
                                : t(
                                      'admin.general.recaptcha.where.off',
                                      'These forms would be protected once reCAPTCHA is enabled and configured:',
                                  )}
                        </p>
                    </div>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {PROTECTED_PAGES.map((p) => (
                        <li
                            key={p.path}
                            className="flex items-center gap-2 text-xs text-on-surface"
                        >
                            <CheckCircle2
                                size={13}
                                className={
                                    effective
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-on-surface-variant/50'
                                }
                            />
                            <span className="font-semibold">{p.label}</span>
                            <code className="text-[10px] text-on-surface-variant">
                                {p.path}
                            </code>
                        </li>
                    ))}
                </ul>
            </div>

            <p className="text-[11px] text-on-surface-variant">
                {t(
                    'admin.general.recaptcha.help_prefix',
                    "Don't have keys yet?",
                )}{' '}
                <a
                    href="https://www.google.com/recaptcha/admin/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline underline-offset-4"
                >
                    {t(
                        'admin.general.recaptcha.help_link',
                        'Create a v2 “I’m not a robot” pair',
                    )}
                    <ExternalLink size={11} />
                </a>
            </p>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t('admin.general.recaptcha.save', 'Save reCAPTCHA settings')}
            </button>
        </EditorPane>
    );
}

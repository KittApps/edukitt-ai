import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    RotateCcw,
    Save,
    Send,
    Server,
} from 'lucide-react';

import {
    NavPanel,
    PageHeader,
    StatusDot,
    TwoColumnLayout,
    type StatusTone,
} from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';
import type { PageProps } from '@/types';

interface SmtpBlock {
    host: string | null;
    port: number | null;
    encryption: 'tls' | 'ssl' | null;
    username: string | null;
    password_set: boolean;
    from_address: string | null;
    from_name: string | null;
}

interface StatusBlock {
    configured: boolean;
}

interface Props {
    smtp: SmtpBlock;
    status: StatusBlock;
}

type SectionKey = 'smtp' | 'test';

interface Section {
    key: SectionKey;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    status: { tone: StatusTone; label: string; title?: string };
}

interface FlashShape {
    success?: string | null;
    error?: string | null;
}

const inputClasses =
    'w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

const STORED_PASSWORD_MASK = '••••••••';

export default function EmailSettings({ smtp, status }: Props) {
    const t = useT();
    const [activeKey, setActiveKey] = useState<SectionKey>('smtp');

    const sections = useMemo<Section[]>(
        () => [
            {
                key: 'smtp',
                label: t('admin.email.nav.smtp.label', 'SMTP'),
                subtitle: t(
                    'admin.email.nav.smtp.subtitle',
                    'Outbound server credentials',
                ),
                icon: <Server size={16} />,
                status: status.configured
                    ? {
                          tone: 'success',
                          label: t('admin.email.nav.smtp.live', 'Live'),
                      }
                    : {
                          tone: 'warning',
                          label: t('admin.email.nav.smtp.setup', 'Setup'),
                          title: t(
                              'admin.email.nav.smtp.setup_title',
                              'SMTP credentials are not fully configured',
                          ),
                      },
            },
            {
                key: 'test',
                label: t('admin.email.nav.test.label', 'Test Email'),
                subtitle: t(
                    'admin.email.nav.test.subtitle',
                    'Send a test message',
                ),
                icon: <Send size={16} />,
                status: { tone: 'muted', label: '' },
            },
        ],
        [status.configured, t],
    );

    return (
        <AdminLayout>
            <Head title={t('admin.email.head_title', 'Email')} />
            <div className="space-y-6">
                <PageHeader
                    title={t('admin.email.title', 'Email')}
                    description={t(
                        'admin.email.description',
                        'Configure SMTP credentials and send a test email to verify deliverability.',
                    )}
                />

                <FlashBanner />

                <TwoColumnLayout
                    aside={
                        <NavPanel label={t('admin.email.nav.label', 'Email')}>
                            {sections.map((section) => (
                                <EmailNavItem
                                    key={section.key}
                                    section={section}
                                    isActive={section.key === activeKey}
                                    onSelect={() => setActiveKey(section.key)}
                                />
                            ))}
                        </NavPanel>
                    }
                >
                    <motion.div
                        key={activeKey}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeKey === 'smtp' ? (
                            <SmtpForm initial={smtp} />
                        ) : (
                            <TestEmailForm status={status} />
                        )}
                    </motion.div>
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}

interface EmailNavItemProps {
    section: Section;
    isActive: boolean;
    onSelect: () => void;
}

function EmailNavItem({ section, isActive, onSelect }: EmailNavItemProps) {
    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                    ? 'bg-primary/10 border border-primary/15'
                    : 'hover:bg-surface-container-low border border-transparent'
            }`}
        >
            <div
                className={`p-2 rounded-lg flex-shrink-0 ${
                    isActive
                        ? 'bg-primary text-white'
                        : 'bg-surface-container text-on-surface-variant group-hover:text-primary'
                }`}
            >
                {section.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p
                    className={`text-sm font-bold truncate ${
                        isActive ? 'text-primary' : 'text-on-surface'
                    }`}
                >
                    {section.label}
                </p>
                <p className="text-[10px] text-on-surface-variant truncate">
                    {section.subtitle}
                </p>
            </div>
            {section.status.label ? (
                <StatusDot
                    tone={section.status.tone}
                    label={section.status.label}
                    title={section.status.title}
                />
            ) : (
                <StatusDot tone={section.status.tone} title={section.status.title} />
            )}
        </button>
    );
}

interface EditorPaneProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void;
}

function EditorPane({
    icon,
    title,
    description,
    children,
    onSubmit,
}: EditorPaneProps) {
    return (
        <form
            onSubmit={onSubmit}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden max-w-2xl"
        >
            <div className="flex items-start gap-3 px-6 py-5 border-b border-surface-container">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h2 className="font-headline font-extrabold text-lg text-on-surface">
                        {title}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        {description}
                    </p>
                </div>
            </div>
            <div className="p-6 space-y-6">{children}</div>
        </form>
    );
}

function FlashBanner() {
    const { props } = usePage<PageProps<{ flash?: FlashShape }>>();
    const flash = props.flash ?? {};
    if (!flash.success && !flash.error) {
        return null;
    }
    if (flash.error) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="min-w-0 break-words">{flash.error}</p>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            <p className="min-w-0 break-words">{flash.success}</p>
        </div>
    );
}

interface SmtpFormData {
    host: string;
    port: string;
    encryption: '' | 'tls' | 'ssl';
    username: string;
    password: string;
    from_address: string;
    from_name: string;
    clear_password: boolean;
}

function SmtpForm({ initial }: { initial: SmtpBlock }) {
    const t = useT();
    const form = useForm<SmtpFormData>({
        host: initial.host ?? '',
        port: initial.port !== null ? String(initial.port) : '',
        encryption: initial.encryption ?? '',
        username: initial.username ?? '',
        password: '',
        from_address: initial.from_address ?? '',
        from_name: initial.from_name ?? '',
        clear_password: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/email/smtp', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('password');
                form.setData('clear_password', false);
            },
        });
    };

    const portValue = form.data.port;
    const portNumber = portValue === '' ? null : Number(portValue);

    return (
        <EditorPane
            icon={<Server size={22} />}
            title={t('admin.email.smtp.title', 'SMTP server')}
            description={t(
                'admin.email.smtp.description',
                'Outbound mail credentials. These override the .env defaults at runtime, so password resets and verification mail go through your relay.',
            )}
            onSubmit={submit}
        >
            <div>
                <label
                    htmlFor="smtp-host"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.email.smtp.host', 'Host')}
                </label>
                <input
                    id="smtp-host"
                    type="text"
                    autoComplete="off"
                    value={form.data.host}
                    onChange={(e) => form.setData('host', e.target.value)}
                    placeholder="smtp.example.com"
                    className={inputClasses}
                />
                {form.errors.host && (
                    <p className="text-xs text-red-600 mt-1">{form.errors.host}</p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="smtp-port"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t('admin.email.smtp.port', 'Port')}
                    </label>
                    <input
                        id="smtp-port"
                        type="number"
                        min={1}
                        max={65535}
                        value={form.data.port}
                        onChange={(e) => form.setData('port', e.target.value)}
                        placeholder="587"
                        className={inputClasses}
                    />
                    <p className="text-xs text-on-surface-variant mt-2">
                        {t(
                            'admin.email.smtp.port_hint',
                            'Use port 587 with TLS for most providers.',
                        )}
                    </p>
                    {form.errors.port && (
                        <p className="text-xs text-red-600 mt-1">{form.errors.port}</p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="smtp-encryption"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t('admin.email.smtp.encryption', 'Encryption')}
                    </label>
                    <select
                        id="smtp-encryption"
                        value={form.data.encryption}
                        onChange={(e) =>
                            form.setData(
                                'encryption',
                                e.target.value as SmtpFormData['encryption'],
                            )
                        }
                        className={inputClasses}
                    >
                        <option value="">
                            {t('admin.email.smtp.encryption.none', 'None')}
                        </option>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                    </select>
                    {form.errors.encryption && (
                        <p className="text-xs text-red-600 mt-1">
                            {form.errors.encryption}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <label
                    htmlFor="smtp-username"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.email.smtp.username', 'Username')}
                </label>
                <input
                    id="smtp-username"
                    type="text"
                    autoComplete="off"
                    value={form.data.username}
                    onChange={(e) => form.setData('username', e.target.value)}
                    placeholder="postmaster@example.com"
                    className={inputClasses}
                />
                {form.errors.username && (
                    <p className="text-xs text-red-600 mt-1">{form.errors.username}</p>
                )}
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label
                        htmlFor="smtp-password"
                        className="block text-sm font-bold text-on-surface"
                    >
                        {t('admin.email.smtp.password', 'Password')}
                    </label>
                    {initial.password_set && !form.data.clear_password && (
                        <button
                            type="button"
                            onClick={() => {
                                form.setData('password', '');
                                form.setData('clear_password', true);
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant hover:text-red-600 transition-colors"
                        >
                            <RotateCcw size={12} />
                            {t(
                                'admin.email.smtp.clear_password',
                                'Clear stored password',
                            )}
                        </button>
                    )}
                </div>
                <input
                    id="smtp-password"
                    type="password"
                    autoComplete="new-password"
                    disabled={form.data.clear_password}
                    value={form.data.password}
                    onChange={(e) => form.setData('password', e.target.value)}
                    placeholder={
                        initial.password_set && !form.data.clear_password
                            ? `${STORED_PASSWORD_MASK} ${t(
                                  'admin.email.smtp.password_saved',
                                  '(saved — leave blank to keep)',
                              )}`
                            : t(
                                  'admin.email.smtp.password_placeholder',
                                  'SMTP password',
                              )
                    }
                    className={`${inputClasses} ${
                        form.data.clear_password ? 'opacity-50' : ''
                    }`}
                />
                {form.data.clear_password && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p>
                                {t(
                                    'admin.email.smtp.clear_password_notice',
                                    'Stored password will be cleared on save.',
                                )}
                            </p>
                            <button
                                type="button"
                                onClick={() => form.setData('clear_password', false)}
                                className="mt-1 underline font-semibold"
                            >
                                {t('admin.email.smtp.cancel_clear', 'Cancel')}
                            </button>
                        </div>
                    </div>
                )}
                {form.errors.password && (
                    <p className="text-xs text-red-600 mt-1">{form.errors.password}</p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="smtp-from-address"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t('admin.email.smtp.from_address', 'Sender address')}
                    </label>
                    <input
                        id="smtp-from-address"
                        type="email"
                        autoComplete="off"
                        value={form.data.from_address}
                        onChange={(e) =>
                            form.setData('from_address', e.target.value)
                        }
                        placeholder="no-reply@example.com"
                        className={inputClasses}
                    />
                    <p className="text-xs text-on-surface-variant mt-2">
                        {t(
                            'admin.email.smtp.from_address_hint',
                            'This is the From address recipients will see.',
                        )}
                    </p>
                    {form.errors.from_address && (
                        <p className="text-xs text-red-600 mt-1">
                            {form.errors.from_address}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="smtp-from-name"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t('admin.email.smtp.from_name', 'Sender name')}
                    </label>
                    <input
                        id="smtp-from-name"
                        type="text"
                        autoComplete="off"
                        value={form.data.from_name}
                        onChange={(e) => form.setData('from_name', e.target.value)}
                        placeholder="EduKitt"
                        className={inputClasses}
                    />
                    {form.errors.from_name && (
                        <p className="text-xs text-red-600 mt-1">
                            {form.errors.from_name}
                        </p>
                    )}
                </div>
            </div>

            {portNumber !== null && (portNumber < 1 || portNumber > 65535) && (
                <p className="text-xs text-amber-600">
                    {t(
                        'admin.email.smtp.port_range_warning',
                        'Port must be between 1 and 65535.',
                    )}
                </p>
            )}

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} /> {t('admin.email.smtp.save', 'Save SMTP settings')}
            </button>
        </EditorPane>
    );
}

interface TestEmailFormData {
    to_address: string;
}

function TestEmailForm({ status }: { status: StatusBlock }) {
    const t = useT();
    const { props } = usePage<PageProps>();
    const defaultEmail = props.auth?.user?.email ?? '';

    const form = useForm<TestEmailFormData>({
        to_address: defaultEmail,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!status.configured) {
            return;
        }
        form.post('/admin/settings/email/test', {
            preserveScroll: true,
        });
    };

    return (
        <EditorPane
            icon={<Send size={22} />}
            title={t('admin.email.test.title', 'Send a test email')}
            description={t(
                'admin.email.test.description',
                'Sends a short message through the saved SMTP settings to confirm deliverability. Use a real inbox you control.',
            )}
            onSubmit={submit}
        >
            {!status.configured && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <p className="min-w-0">
                        {t(
                            'admin.email.test.not_configured',
                            'SMTP is not fully configured yet. Fill in host, port, username and sender address on the SMTP tab before sending a test.',
                        )}
                    </p>
                </div>
            )}

            <div>
                <label
                    htmlFor="email-test-to"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.email.test.to_address', 'Recipient address')}
                </label>
                <input
                    id="email-test-to"
                    type="email"
                    autoComplete="off"
                    value={form.data.to_address}
                    onChange={(e) => form.setData('to_address', e.target.value)}
                    placeholder="you@example.com"
                    className={inputClasses}
                    disabled={!status.configured}
                />
                <p className="text-xs text-on-surface-variant mt-2">
                    {t(
                        'admin.email.test.subject_hint',
                        'The test message has the subject "EduKitt test email" and a short body explaining it was sent by the admin panel.',
                    )}
                </p>
                {form.errors.to_address && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.to_address}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={form.processing || !status.configured}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Send size={16} />{' '}
                {form.processing
                    ? t('admin.email.test.sending', 'Sending…')
                    : t('admin.email.test.send', 'Send test email')}
            </button>
        </EditorPane>
    );
}

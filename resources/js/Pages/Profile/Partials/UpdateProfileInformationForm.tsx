import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Check, Mail, Save, ShieldAlert, ShieldCheck, UserCog } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function UpdateProfileInformationForm({
    mustVerifyEmail,
    verificationRequired,
    hasPendingEmailChange,
    status,
}: {
    mustVerifyEmail: boolean;
    verificationRequired: boolean;
    hasPendingEmailChange: boolean;
    status?: string;
}) {
    const t = useT();
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const emailChanged = data.email.trim().toLowerCase() !== user.email.toLowerCase();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <SectionCard
            icon={<UserCog size={18} />}
            iconClass="bg-primary/10 text-primary"
            title={t('profile.info.title', 'Profile information')}
            description={t(
                'profile.info.description',
                "Update your account's display name and email address.",
            )}
        >
            <form onSubmit={submit} className="space-y-5">
                <Field
                    label={t('profile.info.name', 'Name')}
                    error={errors.name}
                >
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoFocus
                        autoComplete="name"
                        className={inputClasses}
                    />
                </Field>

                <Field
                    label={t('profile.info.email', 'Email')}
                    error={errors.email}
                >
                    <input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        disabled={hasPendingEmailChange}
                        autoComplete="username"
                        className={
                            inputClasses +
                            (hasPendingEmailChange
                                ? ' opacity-60 cursor-not-allowed'
                                : '')
                        }
                    />
                    {verificationRequired && emailChanged && !hasPendingEmailChange && (
                        <p className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1.5">
                            <ShieldAlert size={12} className="text-amber-600" />
                            {t(
                                'profile.info.email.verify_required',
                                "We'll email a 6-digit code to confirm the new address.",
                            )}
                        </p>
                    )}
                </Field>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                        <Mail size={16} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold">
                                {t(
                                    'profile.info.verify.title',
                                    'Your email address is unverified.',
                                )}
                            </p>
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="mt-1 inline-flex items-center gap-1 font-bold text-amber-900 underline hover:no-underline"
                            >
                                {t(
                                    'profile.info.verify.resend',
                                    'Resend verification email',
                                )}
                            </Link>
                            {status === 'verification-link-sent' && (
                                <p className="mt-2 inline-flex items-center gap-1 text-amber-800">
                                    <ShieldCheck size={12} />
                                    {t(
                                        'profile.info.verify.sent',
                                        'A new link has been sent to your email.',
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <SaveRow
                    processing={processing}
                    recentlySuccessful={recentlySuccessful}
                />
            </form>
        </SectionCard>
    );
}

const inputClasses =
    'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {label}
            </label>
            {children}
            {error && (
                <p className="text-[11px] text-red-600 mt-1.5">{error}</p>
            )}
        </div>
    );
}

function SectionCard({
    icon,
    iconClass,
    title,
    description,
    children,
}: {
    icon: React.ReactNode;
    iconClass: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <header className="flex items-start gap-3 px-6 py-5 border-b border-surface-container">
                <div
                    className={`p-2.5 rounded-xl flex-shrink-0 ${iconClass}`}
                >
                    {icon}
                </div>
                <div className="min-w-0">
                    <h2 className="font-headline font-extrabold text-base text-on-surface">
                        {title}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        {description}
                    </p>
                </div>
            </header>
            <div className="px-6 py-6 max-w-2xl">{children}</div>
        </section>
    );
}

function SaveRow({
    processing,
    recentlySuccessful,
}: {
    processing: boolean;
    recentlySuccessful: boolean;
}) {
    const t = useT();
    return (
        <div className="flex items-center justify-end gap-3 pt-2">
            <Transition
                show={recentlySuccessful}
                enter="transition ease-in-out duration-200"
                enterFrom="opacity-0 translate-x-1"
                enterTo="opacity-100 translate-x-0"
                leave="transition ease-in-out duration-300"
                leaveTo="opacity-0"
            >
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700">
                    <Check size={12} /> {t('profile.saved', 'Saved')}
                </span>
            </Transition>
            <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Save size={14} />
                {processing
                    ? t('profile.saving', 'Saving\u2026')
                    : t('profile.save', 'Save changes')}
            </button>
        </div>
    );
}

export { SectionCard, Field, SaveRow, inputClasses };

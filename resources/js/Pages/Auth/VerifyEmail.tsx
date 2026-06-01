import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { CheckCircle2, LogOut, MailCheck } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    AuthButton,
    AuthCard,
} from '@/Components/Public/Auth';
import { useT } from '@/lib/i18n';

interface VerifyEmailProps {
    status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
    const t = useT();
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    const linkSent = status === 'verification-link-sent';

    return (
        <PublicLayout>
            <Head title={t('auth.verify.head_title', 'Verify your email')} />

            <div className="max-w-md mx-auto px-6 py-14 md:py-20">
                <AuthCard
                    centered
                    title={t('auth.verify.title', 'Verify email')}
                >
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3.5">
                    <MailCheck size={18} className="mt-0.5 shrink-0 text-primary" />
                    <div className="text-sm font-medium text-on-surface leading-relaxed">
                        {t(
                            'auth.verify.instructions',
                            'Open the email we just sent and click the verification link to continue.',
                        )}
                    </div>
                </div>

                {linkSent && (
                    <div
                        role="status"
                        className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-sm font-semibold text-primary"
                    >
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        <span>
                            {t(
                                'auth.verify.link_sent',
                                'A new verification link has been sent to the email address you registered with.',
                            )}
                        </span>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <AuthButton loading={processing}>
                        {processing
                            ? t('auth.verify.cta_loading', 'Sending…')
                            : t('auth.verify.cta', 'Resend verification email')}
                    </AuthButton>
                </form>

                <div className="mt-6 pt-5 border-t border-surface-container flex items-center justify-center">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
                    >
                        <LogOut size={14} />
                        {t('auth.verify.logout', 'Sign out')}
                    </Link>
                </div>
                </AuthCard>
            </div>
        </PublicLayout>
    );
}

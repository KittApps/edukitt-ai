import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    AuthButton,
    AuthCard,
    AuthField,
    AuthFooterLink,
    AuthInput,
    Recaptcha,
} from '@/Components/Public/Auth';
import { useT } from '@/lib/i18n';

interface ForgotPasswordProps {
    status?: string;
}

export default function ForgotPassword({ status }: ForgotPasswordProps) {
    const t = useT();

    const { data, setData, post, processing, errors } = useForm({
        email: '',
        recaptcha_token: '' as string,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <PublicLayout>
            <Head title={t('auth.forgot.head_title', 'Reset your password')} />

            <div className="max-w-md mx-auto px-6 py-14 md:py-20">
                <AuthCard
                    centered
                    title={t('auth.forgot.title', 'Reset password')}
                    footer={
                        <AuthFooterLink
                            label={t('auth.forgot.back_to_login', 'Back to sign in')}
                            href={route('login')}
                            icon={<ArrowLeft size={14} />}
                        />
                    }
                >
                {status && (
                    <div
                        role="status"
                        className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-sm font-semibold text-primary"
                    >
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        <span>{status}</span>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-5" noValidate>
                    <AuthField
                        htmlFor="email"
                        label={t('auth.fields.email.label', 'Email')}
                        error={errors.email}
                    >
                        <AuthInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            autoComplete="username"
                            isFocused
                            invalid={Boolean(errors.email)}
                            placeholder={t(
                                'auth.fields.email.placeholder',
                                'you@example.com',
                            )}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </AuthField>

                    <Recaptcha
                        onToken={(token) =>
                            setData('recaptcha_token', token ?? '')
                        }
                        error={errors.recaptcha_token}
                    />

                    <AuthButton loading={processing}>
                        {processing
                            ? t('auth.forgot.cta_loading', 'Sending reset link…')
                            : t('auth.forgot.cta', 'Email password reset link')}
                    </AuthButton>
                </form>
                </AuthCard>
            </div>
        </PublicLayout>
    );
}

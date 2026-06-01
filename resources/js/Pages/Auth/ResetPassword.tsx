import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
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

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const t = useT();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
        recaptcha_token: '' as string,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <PublicLayout>
            <Head title={t('auth.reset.head_title', 'Set a new password')} />

            <div className="max-w-md mx-auto px-6 py-14 md:py-20">
                <AuthCard
                    centered
                    title={t('auth.reset.title', 'New password')}
                    footer={
                        <AuthFooterLink
                            label={t('auth.reset.back_to_login', 'Back to sign in')}
                            href={route('login')}
                            icon={<ArrowLeft size={14} />}
                        />
                    }
                >
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
                            readOnly
                            invalid={Boolean(errors.email)}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </AuthField>

                    <AuthField
                        htmlFor="password"
                        label={t('auth.fields.password.label', 'New password')}
                        error={errors.password}
                    >
                        <div className="relative">
                            <AuthInput
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                autoComplete="new-password"
                                isFocused
                                invalid={Boolean(errors.password)}
                                placeholder={t(
                                    'auth.fields.password.placeholder_new',
                                    'Choose a strong password',
                                )}
                                className="pe-11"
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={
                                    showPassword
                                        ? t('auth.fields.password.hide', 'Hide password')
                                        : t('auth.fields.password.show', 'Show password')
                                }
                                aria-pressed={showPassword}
                                className="absolute inset-y-0 end-0 px-3.5 inline-flex items-center text-on-surface-variant hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </AuthField>

                    <AuthField
                        htmlFor="password_confirmation"
                        label={t(
                            'auth.fields.password_confirmation.label',
                            'Confirm password',
                        )}
                        error={errors.password_confirmation}
                    >
                        <div className="relative">
                            <AuthInput
                                id="password_confirmation"
                                type={showConfirmation ? 'text' : 'password'}
                                name="password_confirmation"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                invalid={Boolean(errors.password_confirmation)}
                                placeholder={t(
                                    'auth.fields.password_confirmation.placeholder',
                                    'Re-enter your new password',
                                )}
                                className="pe-11"
                                onChange={(e) =>
                                    setData('password_confirmation', e.target.value)
                                }
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmation((v) => !v)}
                                aria-label={
                                    showConfirmation
                                        ? t('auth.fields.password.hide', 'Hide password')
                                        : t('auth.fields.password.show', 'Show password')
                                }
                                aria-pressed={showConfirmation}
                                className="absolute inset-y-0 end-0 px-3.5 inline-flex items-center text-on-surface-variant hover:text-primary transition-colors"
                            >
                                {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </AuthField>

                    <Recaptcha
                        onToken={(token) =>
                            setData('recaptcha_token', token ?? '')
                        }
                        error={errors.recaptcha_token}
                    />

                    <AuthButton loading={processing}>
                        {processing
                            ? t('auth.reset.cta_loading', 'Resetting password…')
                            : t('auth.reset.cta', 'Reset password')}
                    </AuthButton>
                </form>
                </AuthCard>
            </div>
        </PublicLayout>
    );
}

import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
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
import { useRegistrationEnabled } from '@/lib/settings';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const t = useT();
    const registrationEnabled = useRegistrationEnabled();
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
        recaptcha_token: '' as string,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <PublicLayout>
            <Head title={t('auth.login.head_title', 'Sign in')} />

            <div className="max-w-md mx-auto px-6 py-14 md:py-20">
                <AuthCard
                    centered
                    title={t('auth.login.title', 'Sign in')}
                    footer={
                        registrationEnabled ? (
                            <AuthFooterLink
                                prompt={t('auth.login.footer.prompt', "Don't have an account?")}
                                label={t('auth.login.footer.cta', 'Create one for free')}
                                href={route('register')}
                            />
                        ) : undefined
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

                    <AuthField
                        htmlFor="password"
                        label={t('auth.fields.password.label', 'Password')}
                        error={errors.password}
                        trailing={
                            canResetPassword ? (
                                <Link
                                    href={route('password.request')}
                                    className="text-xs font-bold text-primary hover:underline underline-offset-4"
                                >
                                    {t('auth.login.forgot_password', 'Forgot password?')}
                                </Link>
                            ) : undefined
                        }
                    >
                        <div className="relative">
                            <AuthInput
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                invalid={Boolean(errors.password)}
                                placeholder={t(
                                    'auth.fields.password.placeholder',
                                    'Your password',
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

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-surface-container text-primary focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-sm font-medium text-on-surface-variant">
                            {t('auth.login.remember_me', 'Remember me on this device')}
                        </span>
                    </label>

                    <Recaptcha
                        onToken={(token) =>
                            setData('recaptcha_token', token ?? '')
                        }
                        error={errors.recaptcha_token}
                    />

                    <AuthButton loading={processing}>
                        {processing
                            ? t('auth.login.cta_loading', 'Signing in…')
                            : t('auth.login.cta', 'Sign in')}
                    </AuthButton>
                </form>
                </AuthCard>
            </div>
        </PublicLayout>
    );
}

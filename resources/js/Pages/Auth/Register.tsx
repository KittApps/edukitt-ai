import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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

export default function Register() {
    const t = useT();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        recaptcha_token: '' as string,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <PublicLayout>
            <Head title={t('auth.register.head_title', 'Create your account')} />

            <div className="max-w-2xl mx-auto px-6 py-14 md:py-20">
                <AuthCard
                    centered
                    wide
                    title={t('auth.register.title', 'Create account')}
                    footer={
                        <AuthFooterLink
                            prompt={t('auth.register.footer.prompt', 'Already have an account?')}
                            label={t('auth.register.footer.cta', 'Sign in')}
                            href={route('login')}
                        />
                    }
                >
                <form onSubmit={submit} className="space-y-5" noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <AuthField
                            htmlFor="name"
                            label={t('auth.fields.name.label', 'Full name')}
                            error={errors.name}
                        >
                            <AuthInput
                                id="name"
                                name="name"
                                value={data.name}
                                autoComplete="name"
                                isFocused
                                required
                                invalid={Boolean(errors.name)}
                                placeholder={t(
                                    'auth.fields.name.placeholder',
                                    'How should we call you?',
                                )}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                        </AuthField>

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
                                required
                                invalid={Boolean(errors.email)}
                                placeholder={t(
                                    'auth.fields.email.placeholder',
                                    'you@example.com',
                                )}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                        </AuthField>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <AuthField
                        htmlFor="password"
                        label={t('auth.fields.password.label', 'Password')}
                        error={errors.password}
                        hint={
                            errors.password
                                ? undefined
                                : t(
                                      'auth.register.password_hint',
                                      'Use at least 8 characters with a mix of letters and numbers.',
                                  )
                        }
                    >
                        <div className="relative">
                            <AuthInput
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                autoComplete="new-password"
                                required
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
                                required
                                invalid={Boolean(errors.password_confirmation)}
                                placeholder={t(
                                    'auth.fields.password_confirmation.placeholder',
                                    'Re-enter your password',
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
                    </div>

                    <Recaptcha
                        onToken={(token) =>
                            setData('recaptcha_token', token ?? '')
                        }
                        error={errors.recaptcha_token}
                    />

                    <AuthButton loading={processing}>
                        {processing
                            ? t('auth.register.cta_loading', 'Creating your account…')
                            : t('auth.register.cta', 'Create account')}
                    </AuthButton>

                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed text-center">
                        {t(
                            'auth.register.terms',
                            'By creating an account you agree to our Terms of Service and Privacy Policy.',
                        )}
                    </p>
                </form>
                </AuthCard>
            </div>
        </PublicLayout>
    );
}

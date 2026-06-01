import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    AuthButton,
    AuthCard,
    AuthField,
    AuthInput,
} from '@/Components/Public/Auth';
import { useT } from '@/lib/i18n';

export default function ConfirmPassword() {
    const t = useT();
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <PublicLayout>
            <Head title={t('auth.confirm.head_title', 'Confirm your password')} />

            <div className="max-w-md mx-auto px-6 py-14 md:py-20">
                <AuthCard
                    centered
                    title={t('auth.confirm.title', 'Confirm password')}
                >
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-surface-container bg-surface-container-low/40 px-3.5 py-3 text-sm font-medium text-on-surface-variant">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                        {t(
                            'auth.confirm.notice',
                            'For your security we re-verify your identity for sensitive actions.',
                        )}
                    </span>
                </div>

                <form onSubmit={submit} className="space-y-5" noValidate>
                    <AuthField
                        htmlFor="password"
                        label={t('auth.fields.password.label', 'Password')}
                        error={errors.password}
                    >
                        <div className="relative">
                            <AuthInput
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                isFocused
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

                    <AuthButton loading={processing}>
                        {processing
                            ? t('auth.confirm.cta_loading', 'Confirming…')
                            : t('auth.confirm.cta', 'Confirm')}
                    </AuthButton>
                </form>
                </AuthCard>
            </div>
        </PublicLayout>
    );
}

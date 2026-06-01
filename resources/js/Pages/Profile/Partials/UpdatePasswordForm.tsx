import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { KeyRound } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
    Field,
    SaveRow,
    SectionCard,
    inputClasses,
} from './UpdateProfileInformationForm';

export default function UpdatePasswordForm() {
    const t = useT();
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <SectionCard
            icon={<KeyRound size={18} />}
            iconClass="bg-secondary/10 text-secondary"
            title={t('profile.password.title', 'Update password')}
            description={t(
                'profile.password.description',
                'Use a long, random password to keep your account secure.',
            )}
        >
            <form onSubmit={submit} className="space-y-5">
                <Field
                    label={t('profile.password.current', 'Current password')}
                    error={errors.current_password}
                >
                    <input
                        ref={currentPasswordInput}
                        type="password"
                        value={data.current_password}
                        onChange={(e) =>
                            setData('current_password', e.target.value)
                        }
                        autoComplete="current-password"
                        className={inputClasses}
                    />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field
                        label={t('profile.password.new', 'New password')}
                        error={errors.password}
                    >
                        <input
                            ref={passwordInput}
                            type="password"
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            autoComplete="new-password"
                            className={inputClasses}
                        />
                    </Field>
                    <Field
                        label={t('profile.password.confirm', 'Confirm password')}
                        error={errors.password_confirmation}
                    >
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            autoComplete="new-password"
                            className={inputClasses}
                        />
                    </Field>
                </div>

                <SaveRow
                    processing={processing}
                    recentlySuccessful={recentlySuccessful}
                />
            </form>
        </SectionCard>
    );
}

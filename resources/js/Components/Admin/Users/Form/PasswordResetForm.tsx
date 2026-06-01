import { useForm } from '@inertiajs/react';
import { KeyRound, Mail, Save } from 'lucide-react';

import { FormCard, FormField } from '@/Components/Admin/SubscriptionPlans';
import { useT } from '@/lib/i18n';
import type { EditUser } from '../types';

interface Props {
    user: EditUser;
}

interface SetPasswordShape {
    password: string;
    password_confirmation: string;
}

export default function PasswordResetForm({ user }: Props) {
    const t = useT();

    const sendLink = useForm({});
    const setPassword = useForm<SetPasswordShape>({
        password: '',
        password_confirmation: '',
    });

    const sendReset = (e: React.FormEvent) => {
        e.preventDefault();
        sendLink.post(`/admin/users/${user.id}/password-reset`, {
            preserveScroll: true,
        });
    };

    const saveManual = (e: React.FormEvent) => {
        e.preventDefault();
        setPassword.patch(`/admin/users/${user.id}/password`, {
            preserveScroll: true,
            onSuccess: () => setPassword.reset(),
        });
    };

    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    return (
        <div className="space-y-6">
            <form onSubmit={sendReset}>
                <FormCard
                    title={t(
                        'admin.users.form.password.reset.title',
                        'Send reset email',
                    )}
                    description={t(
                        'admin.users.form.password.reset.description',
                        'Emails {email} a one-time link that lets the user set a new password themselves. Requires working SMTP.',
                        { email: user.email },
                    )}
                    icon={<Mail size={16} className="text-primary" />}
                >
                    <p className="text-xs text-on-surface-variant mb-4">
                        {t(
                            'admin.users.form.password.reset.note',
                            'The link expires after a short delay per Laravel\u2019s password broker config. The user\u2019s current password is not changed until they complete the flow.',
                        )}
                    </p>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={sendLink.processing}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            <Mail size={14} />{' '}
                            {sendLink.processing
                                ? t(
                                      'admin.users.form.password.reset.sending',
                                      'Sending\u2026',
                                  )
                                : t(
                                      'admin.users.form.password.reset.submit',
                                      'Send reset email',
                                  )}
                        </button>
                    </div>
                </FormCard>
            </form>

            <form onSubmit={saveManual}>
                <FormCard
                    title={t(
                        'admin.users.form.password.manual.title',
                        'Set password manually',
                    )}
                    description={t(
                        'admin.users.form.password.manual.description',
                        'Useful when SMTP is misconfigured or for comp / internal accounts. The new password is hashed before being written to the user record.',
                    )}
                    icon={<KeyRound size={16} className="text-secondary" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            label={t(
                                'admin.users.form.password.manual.password',
                                'New password',
                            )}
                            htmlFor="user-manual-password"
                            hint={t(
                                'admin.users.form.password.manual.password_hint',
                                'At least 8 characters.',
                            )}
                        >
                            <input
                                id="user-manual-password"
                                type="password"
                                value={setPassword.data.password}
                                onChange={(e) =>
                                    setPassword.setData('password', e.target.value)
                                }
                                className={inputClasses}
                                autoComplete="new-password"
                            />
                            {setPassword.errors.password && (
                                <p className="text-xs text-red-600 mt-1">
                                    {setPassword.errors.password}
                                </p>
                            )}
                        </FormField>
                        <FormField
                            label={t(
                                'admin.users.form.password.manual.confirmation',
                                'Confirm password',
                            )}
                            htmlFor="user-manual-password-confirmation"
                        >
                            <input
                                id="user-manual-password-confirmation"
                                type="password"
                                value={setPassword.data.password_confirmation}
                                onChange={(e) =>
                                    setPassword.setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                className={inputClasses}
                                autoComplete="new-password"
                            />
                        </FormField>
                    </div>

                    <div className="mt-5 flex justify-end">
                        <button
                            type="submit"
                            disabled={
                                setPassword.processing ||
                                setPassword.data.password.length === 0
                            }
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            <Save size={14} />{' '}
                            {setPassword.processing
                                ? t(
                                      'admin.users.form.password.manual.saving',
                                      'Saving\u2026',
                                  )
                                : t(
                                      'admin.users.form.password.manual.submit',
                                      'Set password',
                                  )}
                        </button>
                    </div>
                </FormCard>
            </form>
        </div>
    );
}

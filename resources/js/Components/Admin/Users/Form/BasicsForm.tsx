import { FileText, ShieldCheck, User as UserIcon } from 'lucide-react';

import { FormCard, FormField } from '@/Components/Admin/SubscriptionPlans';
import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

export interface BasicsState {
    name: string;
    email: string;
    is_admin: boolean;
    is_active: boolean;
    email_verified: boolean;
}

interface Props {
    mode: 'create' | 'edit';
    value: BasicsState;
    onChange: <K extends keyof BasicsState>(field: K, val: BasicsState[K]) => void;
    errors?: Partial<Record<keyof BasicsState, string>>;
    /** Optional password fields rendered only on Create. */
    password?: {
        value: string;
        confirmation: string;
        onChange: (next: { password: string; password_confirmation: string }) => void;
        errors?: { password?: string; password_confirmation?: string };
    };
}

export default function BasicsForm({ mode, value, onChange, errors, password }: Props) {
    const t = useT();

    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    return (
        <div className="space-y-6">
            <FormCard
                title={t('admin.users.form.basics.title', 'Basics')}
                description={t(
                    'admin.users.form.basics.description',
                    'Identity and role for this user account.',
                )}
                icon={<FileText size={16} className="text-primary" />}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        label={t('admin.users.form.basics.name', 'Full name')}
                        htmlFor="user-name"
                    >
                        <input
                            id="user-name"
                            type="text"
                            value={value.name}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder={t(
                                'admin.users.form.basics.name_placeholder',
                                'Jane Doe',
                            )}
                            className={inputClasses}
                            autoComplete="name"
                        />
                        {errors?.name && (
                            <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                        )}
                    </FormField>
                    <FormField
                        label={t('admin.users.form.basics.email', 'Email')}
                        htmlFor="user-email"
                    >
                        <input
                            id="user-email"
                            type="email"
                            value={value.email}
                            onChange={(e) => onChange('email', e.target.value)}
                            placeholder="jane@example.com"
                            className={inputClasses}
                            autoComplete="email"
                        />
                        {errors?.email && (
                            <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                        )}
                    </FormField>

                    {password && (
                        <>
                            <FormField
                                label={t(
                                    'admin.users.form.basics.password',
                                    'Initial password',
                                )}
                                htmlFor="user-password"
                                hint={t(
                                    'admin.users.form.basics.password_hint',
                                    'At least 8 characters. You can change or reset it later from the Password tab.',
                                )}
                            >
                                <input
                                    id="user-password"
                                    type="password"
                                    value={password.value}
                                    onChange={(e) =>
                                        password.onChange({
                                            password: e.target.value,
                                            password_confirmation:
                                                password.confirmation,
                                        })
                                    }
                                    className={inputClasses}
                                    autoComplete="new-password"
                                />
                                {password.errors?.password && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {password.errors.password}
                                    </p>
                                )}
                            </FormField>
                            <FormField
                                label={t(
                                    'admin.users.form.basics.password_confirmation',
                                    'Confirm password',
                                )}
                                htmlFor="user-password-confirmation"
                            >
                                <input
                                    id="user-password-confirmation"
                                    type="password"
                                    value={password.confirmation}
                                    onChange={(e) =>
                                        password.onChange({
                                            password: password.value,
                                            password_confirmation: e.target.value,
                                        })
                                    }
                                    className={inputClasses}
                                    autoComplete="new-password"
                                />
                            </FormField>
                        </>
                    )}
                </div>

                <div className="mt-5 border-t border-surface-container pt-2">
                    <FormField
                        label={t('admin.users.form.basics.role.label', 'Role')}
                        hint={t(
                            'admin.users.form.basics.role.hint',
                            'Admins have full access to this admin panel.',
                        )}
                        inline
                    >
                        <div className="inline-flex rounded-xl bg-surface-container-low border border-surface-container p-0.5">
                            <RoleToggle
                                active={!value.is_admin}
                                onClick={() => onChange('is_admin', false)}
                                icon={<UserIcon size={12} />}
                                label={t('admin.users.form.basics.role.user', 'User')}
                            />
                            <RoleToggle
                                active={value.is_admin}
                                onClick={() => onChange('is_admin', true)}
                                icon={<ShieldCheck size={12} />}
                                label={t('admin.users.form.basics.role.admin', 'Admin')}
                            />
                        </div>
                    </FormField>

                    <FormField
                        label={t(
                            'admin.users.form.basics.email_verified.label',
                            'Email verified',
                        )}
                        hint={
                            mode === 'create'
                                ? t(
                                      'admin.users.form.basics.email_verified.hint_create',
                                      'When ON, the user can sign in immediately without the verification step.',
                                  )
                                : t(
                                      'admin.users.form.basics.email_verified.hint_edit',
                                      'Toggle to mark this email as verified or send the user back through verification.',
                                  )
                        }
                        inline
                    >
                        <Toggle
                            checked={value.email_verified}
                            onChange={(v) => onChange('email_verified', v)}
                        />
                    </FormField>

                    <FormField
                        label={t(
                            'admin.users.form.basics.is_active.label',
                            'Account active',
                        )}
                        hint={t(
                            'admin.users.form.basics.is_active.hint',
                            'When OFF, the user is blocked from logging in and any live session is terminated on their next request.',
                        )}
                        inline
                    >
                        <Toggle
                            checked={value.is_active}
                            onChange={(v) => onChange('is_active', v)}
                        />
                        {errors?.is_active && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.is_active}
                            </p>
                        )}
                    </FormField>
                </div>
            </FormCard>
        </div>
    );
}

function RoleToggle({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

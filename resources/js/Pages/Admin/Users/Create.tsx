import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, FileText, Save } from 'lucide-react';

import {
    NavPanel,
    PageHeader,
    TwoColumnLayout,
} from '@/Components/Admin/Shared';
import { SectionNavItem } from '@/Components/Admin/SubscriptionPlans';
import {
    BasicsForm,
    FlashBanner,
    SubscriptionForm,
    type BasicsState,
    type SubscriptionState,
} from '@/Components/Admin/Users/Form';
import type { PlanOption, StoreUserPayload } from '@/Components/Admin/Users';
import { useT } from '@/lib/i18n';

interface Props {
    plans: PlanOption[];
    creditRateUsd: number;
}

type SectionKey = 'basics' | 'subscription';

export default function UsersCreate({ plans }: Props) {
    const t = useT();
    const [activeSection, setActiveSection] = useState<SectionKey>('basics');

    const form = useForm<StoreUserPayload>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_admin: false,
        is_active: true,
        email_verified: true,
        subscription_plan_id: null,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/users', { preserveScroll: true });
    };

    const basicsValue: BasicsState = useMemo(
        () => ({
            name: form.data.name,
            email: form.data.email,
            is_admin: form.data.is_admin,
            is_active: form.data.is_active,
            email_verified: form.data.email_verified,
        }),
        [
            form.data.name,
            form.data.email,
            form.data.is_admin,
            form.data.is_active,
            form.data.email_verified,
        ],
    );

    const subscriptionValue: SubscriptionState = useMemo(
        () => ({
            subscription_plan_id: form.data.subscription_plan_id,
            period_starts_at: '',
            period_ends_at: '',
        }),
        [form.data.subscription_plan_id],
    );

    const sections = [
        {
            key: 'basics' as const,
            label: t('admin.users.form.nav.basics', 'Basics'),
            hint: form.data.name || t('admin.users.form.nav.basics_hint', 'Required'),
            icon: FileText,
        },
        {
            key: 'subscription' as const,
            label: t('admin.users.form.nav.subscription', 'Subscription'),
            hint:
                form.data.subscription_plan_id !== null
                    ? plans.find((p) => p.id === form.data.subscription_plan_id)?.name ??
                      t('admin.users.form.nav.subscription_hint_set', 'Plan selected')
                    : t('admin.users.form.nav.subscription_hint_none', 'No plan'),
            icon: CreditCard,
        },
    ];

    return (
        <AdminLayout>
            <Head title={t('admin.users.create.head_title', 'New user')} />

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors mb-3"
                    >
                        <ArrowLeft size={13} />{' '}
                        {t('admin.users.form.back', 'Back to users')}
                    </Link>
                    <PageHeader
                        title={t('admin.users.create.title', 'Create user')}
                        description={t(
                            'admin.users.create.description',
                            'Create a new account manually. Stripe is not involved \u2014 use this for admin staff, internal test users, or comp accounts.',
                        )}
                        actions={
                            <>
                                <Link
                                    href="/admin/users"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                                >
                                    {t('admin.users.form.cancel', 'Cancel')}
                                </Link>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    <Save size={14} />{' '}
                                    {form.processing
                                        ? t('admin.users.form.saving', 'Saving\u2026')
                                        : t(
                                              'admin.users.create.submit',
                                              'Create user',
                                          )}
                                </button>
                            </>
                        }
                    />
                </div>

                <FlashBanner />

                <TwoColumnLayout
                    aside={
                        <NavPanel
                            label={t('admin.users.form.nav.label', 'Sections')}
                        >
                            {sections.map((s) => (
                                <SectionNavItem
                                    key={s.key}
                                    icon={s.icon}
                                    label={s.label}
                                    hint={s.hint}
                                    isActive={activeSection === s.key}
                                    onSelect={() => setActiveSection(s.key)}
                                />
                            ))}
                        </NavPanel>
                    }
                >
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeSection === 'basics' && (
                            <BasicsForm
                                mode="create"
                                value={basicsValue}
                                onChange={(field, val) =>
                                    form.setData(field, val as never)
                                }
                                errors={{
                                    name: form.errors.name,
                                    email: form.errors.email,
                                    is_admin: form.errors.is_admin,
                                    is_active: form.errors.is_active,
                                    email_verified: form.errors.email_verified,
                                }}
                                password={{
                                    value: form.data.password,
                                    confirmation: form.data.password_confirmation,
                                    onChange: ({ password, password_confirmation }) => {
                                        form.setData('password', password);
                                        form.setData(
                                            'password_confirmation',
                                            password_confirmation,
                                        );
                                    },
                                    errors: {
                                        password: form.errors.password,
                                        password_confirmation:
                                            form.errors.password_confirmation,
                                    },
                                }}
                            />
                        )}
                        {activeSection === 'subscription' && (
                            <SubscriptionForm
                                mode="create"
                                value={subscriptionValue}
                                plans={plans}
                                onChange={(field, val) => {
                                    if (field === 'subscription_plan_id') {
                                        form.setData(
                                            'subscription_plan_id',
                                            val as number | null,
                                        );
                                    }
                                    // period_* are disabled on Create
                                }}
                                errors={{
                                    subscription_plan_id:
                                        form.errors.subscription_plan_id,
                                }}
                            />
                        )}
                    </motion.div>
                </TwoColumnLayout>
            </form>
        </AdminLayout>
    );
}

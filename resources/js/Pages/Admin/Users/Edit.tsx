import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Coins,
    CreditCard,
    FileText,
    KeyRound,
    Save,
} from 'lucide-react';

import {
    NavPanel,
    PageHeader,
    TwoColumnLayout,
} from '@/Components/Admin/Shared';
import { SectionNavItem } from '@/Components/Admin/SubscriptionPlans';
import {
    BasicsForm,
    CreditsForm,
    FlashBanner,
    PasswordResetForm,
    SubscriptionForm,
    type BasicsState,
    type SubscriptionState,
} from '@/Components/Admin/Users/Form';
import type {
    EditUser,
    PlanOption,
    UpdateUserPayload,
} from '@/Components/Admin/Users';
import { useT } from '@/lib/i18n';

interface Props {
    user: EditUser;
    plans: PlanOption[];
    creditRateUsd: number;
}

type SectionKey = 'basics' | 'subscription' | 'credits' | 'password';

const VALID_SECTIONS: readonly SectionKey[] = [
    'basics',
    'subscription',
    'credits',
    'password',
];

/**
 * Read `?section=…` once on mount so deep-links from sibling admin
 * pages (e.g. the Subscriptions list) can land directly on the
 * relevant tab. Falls back to "basics" for anything missing or
 * unrecognised; uses window.location so it works pre-hydration too.
 */
function initialSectionFromUrl(): SectionKey {
    if (typeof window === 'undefined') return 'basics';
    const candidate = new URL(window.location.href).searchParams.get('section');
    return (VALID_SECTIONS as readonly string[]).includes(candidate ?? '')
        ? (candidate as SectionKey)
        : 'basics';
}

export default function UsersEdit({ user, plans, creditRateUsd }: Props) {
    const t = useT();
    const [activeSection, setActiveSection] = useState<SectionKey>(
        () => initialSectionFromUrl(),
    );

    const balanceStart = user.balance.period_starts_at
        ? user.balance.period_starts_at.slice(0, 10)
        : '';
    const balanceEnd = user.balance.period_ends_at
        ? user.balance.period_ends_at.slice(0, 10)
        : '';

    const form = useForm<UpdateUserPayload>({
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
        is_active: user.is_active,
        email_verified: user.email_verified,
        subscription_plan_id: user.subscription_plan_id,
        period_starts_at: balanceStart,
        period_ends_at: balanceEnd,
    });

    const submit = () => {
        form.patch(`/admin/users/${user.id}`, { preserveScroll: true });
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
            period_starts_at: form.data.period_starts_at ?? '',
            period_ends_at: form.data.period_ends_at ?? '',
        }),
        [
            form.data.subscription_plan_id,
            form.data.period_starts_at,
            form.data.period_ends_at,
        ],
    );

    const planName =
        form.data.subscription_plan_id !== null
            ? plans.find((p) => p.id === form.data.subscription_plan_id)?.name ?? null
            : null;

    const sections = [
        {
            key: 'basics' as const,
            label: t('admin.users.form.nav.basics', 'Basics'),
            hint: form.data.name || user.email,
            icon: FileText,
        },
        {
            key: 'subscription' as const,
            label: t('admin.users.form.nav.subscription', 'Subscription'),
            hint:
                planName ??
                t('admin.users.form.nav.subscription_hint_none', 'No plan'),
            icon: CreditCard,
        },
        {
            key: 'credits' as const,
            label: t('admin.users.form.nav.credits', 'Credits'),
            hint: t(
                'admin.users.form.nav.credits_hint',
                '{used} / {total} this period',
                {
                    used: user.balance.used.toLocaleString(),
                    total: user.balance.total.toLocaleString(),
                },
            ),
            icon: Coins,
        },
        {
            key: 'password' as const,
            label: t('admin.users.form.nav.password', 'Password'),
            hint: t('admin.users.form.nav.password_hint', 'Reset or set manually'),
            icon: KeyRound,
        },
    ];

    // The Basics + Subscription combined Save button only makes sense
    // on those two panes — Credits and Password each carry their own
    // submit inside the pane (separate endpoints, separate validation).
    const showCombinedSave = activeSection === 'basics' || activeSection === 'subscription';

    return (
        <AdminLayout>
            <Head
                title={t('admin.users.edit.head_title', 'Edit {name}', {
                    name: user.name,
                })}
            />

            <div className="space-y-6">
                <div>
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors mb-3"
                    >
                        <ArrowLeft size={13} />{' '}
                        {t('admin.users.form.back', 'Back to users')}
                    </Link>
                    <PageHeader
                        title={t('admin.users.edit.title', 'Edit {name}', {
                            name: user.name,
                        })}
                        description={t(
                            'admin.users.edit.description',
                            'Update profile, role, subscription, credits, and password for this user.',
                        )}
                        actions={
                            <>
                                <Link
                                    href="/admin/users"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                                >
                                    {t('admin.users.form.cancel', 'Close')}
                                </Link>
                                {showCombinedSave && (
                                    <button
                                        type="button"
                                        onClick={submit}
                                        disabled={form.processing}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                                    >
                                        <Save size={14} />{' '}
                                        {form.processing
                                            ? t(
                                                  'admin.users.form.saving',
                                                  'Saving\u2026',
                                              )
                                            : t(
                                                  'admin.users.edit.submit',
                                                  'Save changes',
                                              )}
                                    </button>
                                )}
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
                                mode="edit"
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
                            />
                        )}
                        {activeSection === 'subscription' && (
                            <SubscriptionForm
                                mode="edit"
                                value={subscriptionValue}
                                plans={plans}
                                status={user.subscription_status}
                                onChange={(field, val) => {
                                    if (field === 'subscription_plan_id') {
                                        form.setData(
                                            'subscription_plan_id',
                                            val as number | null,
                                        );
                                    } else if (field === 'period_starts_at') {
                                        form.setData(
                                            'period_starts_at',
                                            (val as string) || null,
                                        );
                                    } else if (field === 'period_ends_at') {
                                        form.setData(
                                            'period_ends_at',
                                            (val as string) || null,
                                        );
                                    }
                                }}
                                errors={{
                                    subscription_plan_id:
                                        form.errors.subscription_plan_id,
                                    period_starts_at: form.errors.period_starts_at,
                                    period_ends_at: form.errors.period_ends_at,
                                }}
                            />
                        )}
                        {activeSection === 'credits' && (
                            <CreditsForm
                                user={user}
                                creditRateUsd={creditRateUsd}
                            />
                        )}
                        {activeSection === 'password' && (
                            <PasswordResetForm user={user} />
                        )}
                    </motion.div>
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}

import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

import {
    CreditsTab,
    CurrentPlanCard,
    PageHeader,
    PlansTab,
    SubscriptionTabBar,
    UsageTab,
    type BillingCycle,
    type CreditBalance,
    type CreditPack,
    type CurrentPlan,
    type ExpiredBanner,
    type StripeContext,
    type SubscriptionPlan,
    type SubscriptionTab,
    type UsageData,
} from '@/Components/Subscription';
import { useT } from '@/lib/i18n';

interface Props {
    creditsEnabled: boolean;
    currentPlan: CurrentPlan | null;
    plans: SubscriptionPlan[];
    creditBalance: CreditBalance;
    creditPacks: CreditPack[];
    usage: UsageData;
    stripe: StripeContext;
    expiredBanner: ExpiredBanner | null;
}

const TAB_ORDER: SubscriptionTab[] = ['plans', 'credits', 'usage'];

function readInitialTab(creditsEnabled: boolean): SubscriptionTab {
    if (typeof window === 'undefined') return 'plans';
    const param = new URL(window.location.href).searchParams.get('tab');
    if (param && TAB_ORDER.includes(param as SubscriptionTab)) {
        const requested = param as SubscriptionTab;
        if (requested === 'credits' && !creditsEnabled) return 'plans';
        return requested;
    }
    return 'plans';
}

export default function SubscriptionPage({
    creditsEnabled,
    currentPlan,
    plans,
    creditBalance,
    creditPacks,
    usage,
    stripe,
    expiredBanner,
}: Props) {
    const t = useT();
    const [tab, setTab] = useState<SubscriptionTab>(() => readInitialTab(creditsEnabled));

    // Keep the URL ?tab= param in sync so deep links from limit-reached
    // modals (which append ?tab=credits or ?tab=plans) land on the right
    // tab even when the page is already mounted.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (url.searchParams.get('tab') !== tab) {
            url.searchParams.set('tab', tab);
            window.history.replaceState(null, '', url.toString());
        }
    }, [tab]);

    const [planSwitching, setPlanSwitching] = useState(false);

    const handleSelectPlan = (plan: SubscriptionPlan, cycle: BillingCycle) => {
        if (plan.is_current) return;

        // Existing paid subscribers always go through swap — including
        // the downgrade-to-Free case, which the controller now handles
        // by cancelling the Stripe subscription on our behalf. New /
        // free users still hit checkout so Stripe can collect a card.
        if (stripe.has_paid_subscription) {
            router.post(
                `/app/subscription/swap/${plan.id}/${cycle}`,
                {},
                {
                    onStart: () => setPlanSwitching(true),
                    onFinish: () => setPlanSwitching(false),
                },
            );
            return;
        }

        router.visit(`/app/subscription/checkout/${plan.id}/${cycle}`);
    };

    const goPortal = () => {
        router.visit('/app/subscription/billing-portal');
    };

    const safeCurrent = useMemo<CurrentPlan>(
        () =>
            currentPlan ?? {
                id: 0,
                slug: 'free',
                name: t('subscription.fallback.no_plan', 'Free'),
                tagline: '',
                status: 'inactive',
                billing_cycle: null,
                renews_at: null,
            },
        [currentPlan, t],
    );

    return (
        <AppLayout>
            <Head title={t('subscription.head_title', 'Subscription')} />

            <div className="space-y-8">
                <PageHeader
                    action={
                        stripe.has_paid_subscription ? (
                            <button
                                type="button"
                                onClick={goPortal}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-sm font-bold transition-colors"
                            >
                                {t('subscription.manage_billing', 'Manage billing')}
                                <ExternalLink size={14} />
                            </button>
                        ) : null
                    }
                />

                {expiredBanner && (
                    <div className="rounded-2xl border border-red-400/50 bg-red-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold text-red-900">
                                {t(
                                    'subscription.expired.title',
                                    'Your subscription has expired.',
                                )}
                            </p>
                            <p className="text-xs text-red-800 mt-0.5">
                                {t(
                                    'subscription.expired.body',
                                    'Renew your plan to continue access.',
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTab('plans')}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:brightness-110"
                        >
                            {t('subscription.expired.cta', 'Renew plan')}
                        </button>
                    </div>
                )}

                <CurrentPlanCard
                    current={safeCurrent}
                    balance={creditBalance}
                    showCredits={creditsEnabled}
                />

                <SubscriptionTabBar
                    active={tab}
                    onChange={setTab}
                    showCredits={creditsEnabled}
                />

                <AnimatePresence mode="wait">
                    {tab === 'plans' && (
                        <TabPanel key="plans">
                            <PlansTab
                                plans={plans}
                                currentPlan={currentPlan}
                                hasPaidSubscription={stripe.has_paid_subscription}
                                submitting={planSwitching}
                                onSelectPlan={handleSelectPlan}
                            />
                        </TabPanel>
                    )}

                    {tab === 'credits' && creditsEnabled && (
                        <TabPanel key="credits">
                            <CreditsTab packs={creditPacks} />
                        </TabPanel>
                    )}

                    {tab === 'usage' && (
                        <TabPanel key="usage">
                            <UsageTab usage={usage} />
                        </TabPanel>
                    )}
                </AnimatePresence>
            </div>
        </AppLayout>
    );
}

function TabPanel({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
        >
            {children}
        </motion.div>
    );
}

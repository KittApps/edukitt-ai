import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    FileText,
    DollarSign,
    Gauge,
    Sparkles,
    Coins,
    CreditCard,
    type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { NavPanel, PageHeader, TwoColumnLayout, type StatusTone } from '@/Components/Admin/Shared';
import {
    PlanBasicsCard,
    PlanCreditsCard,
    PlanFeaturesCard,
    PlanLimitsCard,
    PlanPricingCard,
    PlanStripeCard,
    SectionNavItem,
    type FeatureCatalogEntry,
    type Plan,
    type PlanFeature,
    type PlanStripe,
} from '@/Components/Admin/SubscriptionPlans';
import { useCurrency } from '@/lib/settings';

type SectionKey = 'basics' | 'pricing' | 'credits' | 'limits' | 'features' | 'stripe';

interface SectionDef {
    key: SectionKey;
    label: string;
    icon: ComponentType<LucideProps>;
}

const SECTIONS: SectionDef[] = [
    { key: 'basics', label: 'Basics', icon: FileText },
    { key: 'pricing', label: 'Pricing', icon: DollarSign },
    { key: 'credits', label: 'Credits', icon: Coins },
    { key: 'limits', label: 'Limits', icon: Gauge },
    { key: 'features', label: 'Features', icon: Sparkles },
    { key: 'stripe', label: 'Stripe', icon: CreditCard },
];

interface Props {
    mode: 'create' | 'edit';
    plan: Plan;
    featureCatalog: FeatureCatalogEntry[];
    creditRateUsd: number;
}

export default function SubscriptionPlanForm({ mode, plan: initial, featureCatalog, creditRateUsd }: Props) {
    const [plan, setPlan] = useState<Plan>(initial);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionKey>('basics');
    const currency = useCurrency();

    const updateField = <K extends keyof Plan>(field: K, value: Plan[K]) => {
        setPlan((prev) => ({ ...prev, [field]: value }));
    };

    const updateLimit = (key: string, value: number) => {
        setPlan((prev) => ({ ...prev, limits: { ...prev.limits, [key]: value } }));
    };

    const updateFeatures = (features: PlanFeature[]) => {
        setPlan((prev) => ({ ...prev, features }));
    };

    const updateStripe = <K extends keyof PlanStripe>(field: K, value: PlanStripe[K]) => {
        setPlan((prev) => {
            const nextStripe = { ...prev.stripe, [field]: value };
            return {
                ...prev,
                stripe: {
                    ...nextStripe,
                    linked: !!nextStripe.monthly_price_id && !!nextStripe.yearly_price_id,
                },
            };
        });
    };

    const handleSave = () => {
        setSaving(true);
        const payload = {
            ...plan,
            stripe_monthly_price_id: plan.stripe.monthly_price_id ?? null,
            stripe_yearly_price_id: plan.stripe.yearly_price_id ?? null,
        };

        const finished = () => setSaving(false);

        // payload includes nested PlanFeature[] which TypeScript can't prove
        // matches FormDataConvertible without an index signature; the cast is
        // safe because Inertia serializes the structure via JSON.
        const wirePayload = payload as unknown as Record<string, never>;
        if (mode === 'create') {
            router.post('/admin/subscription-plans', wirePayload, {
                onFinish: finished,
                onError: finished,
            });
        } else if (plan.id !== null) {
            router.put(`/admin/subscription-plans/${plan.id}`, wirePayload, {
                onFinish: finished,
                onError: finished,
            });
        } else {
            finished();
        }
    };

    const fmtMoney = (v: number) =>
        currency.format(v, { maximumFractionDigits: 0, zeroAs: 'Free' });

    const unlimitedLimits = useMemo(
        () => Object.values(plan.limits).filter((v) => v === -1).length,
        [plan.limits],
    );
    const includedFeatures = useMemo(
        () => plan.features.filter((f) => f.included).length,
        [plan.features],
    );

    const sectionMeta: Record<
        SectionKey,
        { hint: string; status?: { tone: StatusTone; label: string; title?: string } }
    > = {
        basics: {
            hint: plan.name ? plan.name : 'Required',
            status: plan.is_active
                ? { tone: 'success', label: 'Active' }
                : { tone: 'muted', label: 'Off' },
        },
        pricing: {
            hint:
                plan.monthly_price > 0
                    ? `${fmtMoney(plan.monthly_price)} / month`
                    : 'Free plan',
        },
        credits: {
            hint: `${plan.default_credits} / month${plan.rollover_unused_credits ? ' · rollover' : ''}`,
        },
        limits: {
            hint:
                unlimitedLimits > 0
                    ? `${unlimitedLimits} unlimited`
                    : `${featureCatalog.length} configurable`,
        },
        features: {
            hint: `${includedFeatures} of ${plan.features.length} included`,
        },
        stripe: {
            hint: plan.stripe.linked ? 'Both prices set' : 'Optional',
            status: plan.stripe.linked
                ? { tone: 'success', label: 'Linked' }
                : undefined,
        },
    };

    return (
        <AdminLayout>
            <Head title={mode === 'create' ? 'New Plan' : `Edit ${plan.name || 'Plan'}`} />

            <div className="space-y-6">
                <div>
                    <Link
                        href="/admin/subscription-plans"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors mb-3"
                    >
                        <ArrowLeft size={13} /> Back to plans
                    </Link>
                    <PageHeader
                        title={mode === 'create' ? 'Create plan' : `Edit ${plan.name || 'plan'}`}
                        description={
                            mode === 'create'
                                ? 'Define a new subscription tier. Wire it to Stripe by pasting Price IDs from your Stripe Dashboard.'
                                : 'Update plan settings. Stripe Price IDs are managed manually from your Stripe Dashboard.'
                        }
                        actions={
                            <>
                                <Link
                                    href="/admin/subscription-plans"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                                >
                                    Cancel
                                </Link>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    <Save size={14} /> {saving ? 'Saving…' : 'Save plan'}
                                </button>
                            </>
                        }
                    />
                </div>

                <TwoColumnLayout
                    aside={
                        <NavPanel label="Sections">
                            {SECTIONS.map((s) => (
                                <SectionNavItem
                                    key={s.key}
                                    icon={s.icon}
                                    label={s.label}
                                    hint={sectionMeta[s.key].hint}
                                    status={sectionMeta[s.key].status}
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
                        className="space-y-6"
                    >
                        {activeSection === 'basics' && (
                            <PlanBasicsCard plan={plan} onChange={updateField} />
                        )}
                        {activeSection === 'pricing' && (
                            <PlanPricingCard plan={plan} onChange={updateField} />
                        )}
                        {activeSection === 'credits' && (
                            <PlanCreditsCard
                                plan={plan}
                                onChange={updateField}
                                creditRateUsd={creditRateUsd}
                            />
                        )}
                        {activeSection === 'limits' && (
                            <PlanLimitsCard
                                plan={plan}
                                catalog={featureCatalog}
                                onChange={updateLimit}
                            />
                        )}
                        {activeSection === 'features' && (
                            <PlanFeaturesCard plan={plan} onChange={updateFeatures} />
                        )}
                        {activeSection === 'stripe' && (
                            <PlanStripeCard plan={plan} onChange={updateStripe} />
                        )}
                    </motion.div>
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}

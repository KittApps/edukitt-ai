import { motion } from 'framer-motion';
import { Check, X, Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCurrency } from '@/lib/settings';
import type { BillingCycle, SubscriptionPlan } from './types';

interface Props {
    plan: SubscriptionPlan;
    index: number;
    billingCycle: BillingCycle;
    /**
     * Monthly price of the user's current plan, used to decide whether
     * this card is an upgrade or downgrade relative to where they are.
     * Pass `null` when the user has no plan (treated as Free, so every
     * paid card reads as an upgrade).
     */
    currentPlanMonthly: number | null;
    disabled?: boolean;
    onSelect?: (plan: SubscriptionPlan) => void;
}

export default function PlanCard({
    plan,
    index,
    billingCycle,
    currentPlanMonthly,
    disabled = false,
    onSelect,
}: Props) {
    const t = useT();
    const currency = useCurrency();
    const monthly = plan.monthly_price;
    const yearly = plan.yearly_price;

    // Relative to the user's current plan: same-price-but-different-plan
    // (unusual but possible with multiple free plans) falls through to
    // the upgrade label as a safe default.
    const reference = currentPlanMonthly ?? 0;
    const isDowngrade = !plan.is_current && monthly < reference;
    const ctaLabel = plan.is_current
        ? t('subscription.plan.current', 'Current plan')
        : isDowngrade
          ? t('subscription.plan.cta.downgrade_to', 'Downgrade to {name}', {
                name: plan.name,
            })
          : t('subscription.plan.cta.upgrade_to', 'Upgrade to {name}', {
                name: plan.name,
            });

    // Show monthly-equivalent price on the yearly tab so users can compare
    // apples to apples; the actual annual amount is shown in the hint below.
    const yearlyMonthly = yearly > 0 ? Math.round(yearly / 12) : 0;
    const displayPrice = billingCycle === 'yearly' ? yearlyMonthly : monthly;

    const yearlySavingsPct =
        monthly > 0 && yearly > 0
            ? Math.round((1 - yearly / (monthly * 12)) * 100)
            : 0;

    const fmtMoney = (v: number) =>
        currency.format(v, {
            maximumFractionDigits: 0,
            zeroAs: t('subscription.plan.free', 'Free'),
        });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`relative rounded-3xl p-[1px] ${
                plan.is_popular
                    ? 'bg-gradient-to-b from-primary via-primary-container to-primary/20'
                    : 'bg-surface-container'
            }`}
        >
            {plan.is_popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-primary to-primary-container text-white text-[10px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-full shadow-lg shadow-primary/25 flex items-center gap-1.5">
                        <Sparkles size={10} />
                        {t('subscription.plan.most_popular', 'Most Popular')}
                    </div>
                </div>
            )}

            <div className="rounded-3xl p-7 h-full flex flex-col bg-surface-container-lowest">
                <div className="mb-6">
                    <h3 className="text-lg font-headline font-extrabold text-on-surface">
                        {plan.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        {plan.tagline}
                    </p>
                </div>

                <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-headline font-black text-on-surface">
                            {fmtMoney(displayPrice)}
                        </span>
                        {displayPrice > 0 && (
                            <span className="text-sm text-on-surface-variant font-medium">
                                / {t('subscription.plan.per_month', 'month')}
                            </span>
                        )}
                    </div>
                    {billingCycle === 'yearly' && yearly > 0 && (
                        <p className="text-[10px] font-bold text-secondary mt-1 uppercase tracking-wider">
                            {t(
                                'subscription.plan.billed_yearly',
                                '{amount} billed yearly',
                                { amount: fmtMoney(yearly) },
                            )}
                            {yearlySavingsPct > 0 &&
                                ` · ${t('subscription.plan.save_pct', 'save {pct}%', {
                                    pct: yearlySavingsPct,
                                })}`}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-6 bg-surface-container-low/60 rounded-xl px-4 py-3">
                    <Sparkles size={14} className="text-primary flex-shrink-0" />
                    <span className="text-sm font-bold text-on-surface">
                        {t(
                            'subscription.plan.credits_per_month',
                            '{count} credits / month',
                            { count: plan.credits_per_month },
                        )}
                    </span>
                </div>

                <div className="space-y-3 flex-1 mb-8">
                    {plan.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-3">
                            {f.included ? (
                                <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                        f.highlight
                                            ? 'bg-primary text-white'
                                            : 'bg-primary/10 text-primary'
                                    }`}
                                >
                                    <Check size={11} strokeWidth={3} />
                                </div>
                            ) : (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-surface-container text-outline-variant">
                                    <X size={11} strokeWidth={3} />
                                </div>
                            )}
                            <span
                                className={`text-sm leading-snug ${
                                    f.included
                                        ? 'text-on-surface font-medium'
                                        : 'text-outline-variant'
                                }`}
                            >
                                {f.text}
                            </span>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => onSelect?.(plan)}
                    disabled={plan.is_current || disabled}
                    className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.97] disabled:active:scale-100 disabled:cursor-default disabled:opacity-60 ${
                        plan.is_current
                            ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/20'
                            : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                    }`}
                >
                    {ctaLabel}
                </button>
            </div>
        </motion.div>
    );
}

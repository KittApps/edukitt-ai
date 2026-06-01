import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Check, Sparkles, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCurrency } from '@/lib/settings';

export interface PublicPlanFeature {
    text: string;
    included: boolean;
    highlight: boolean;
}

export interface PublicPlan {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    monthly_price: number;
    currency: string;
    default_credits: number;
    features: PublicPlanFeature[];
    is_popular: boolean;
    is_default: boolean;
    is_free: boolean;
}

interface Props {
    plans: PublicPlan[];
    centered?: boolean;
}

export default function PlansTeaserSection({ plans, centered = false }: Props) {
    const t = useT();

    if (plans.length === 0) {
        return null;
    }

    return (
        <section id="pricing" className="py-20 md:py-28">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5 }}
                    className={`max-w-2xl mb-12 md:mb-14 ${centered ? 'mx-auto text-center' : ''}`}
                >
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.18em] mb-3">
                        {t('public.plans.kicker', 'Pricing')}
                    </p>
                    <h2 className="font-headline font-extrabold tracking-tight text-on-surface text-3xl md:text-4xl leading-[1.1]">
                        {t('public.plans.title', 'Pick your plan.')}
                    </h2>
                    <p className="mt-4 text-on-surface-variant text-base leading-relaxed">
                        {t(
                            'public.plans.subtitle',
                            'Start free, upgrade when you need more credits or advanced AI. Change plans any time.',
                        )}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                    {plans.map((plan, index) => (
                        <PlanCard key={plan.id} plan={plan} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function PlanCard({ plan, index }: { plan: PublicPlan; index: number }) {
    const t = useT();
    const currency = useCurrency();

    const fmtPrice = (v: number) =>
        currency.format(v, {
            maximumFractionDigits: 0,
            zeroAs: t('public.plans.free', 'Free'),
        });

    const ctaHref = `/register?plan=${encodeURIComponent(plan.slug)}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
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
                        {t('public.plans.most_popular', 'Most Popular')}
                    </div>
                </div>
            )}

            <div className="rounded-3xl p-7 h-full flex flex-col bg-surface-container-lowest">
                <div className="mb-6">
                    <h3 className="text-lg font-headline font-extrabold text-on-surface">
                        {plan.name}
                    </h3>
                    {plan.tagline && (
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {plan.tagline}
                        </p>
                    )}
                </div>

                <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-headline font-black text-on-surface">
                            {fmtPrice(plan.monthly_price)}
                        </span>
                        {plan.monthly_price > 0 && (
                            <span className="text-sm text-on-surface-variant font-medium">
                                / {t('public.plans.per_month', 'month')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-6 bg-surface-container-low/60 rounded-xl px-4 py-3">
                    <Sparkles size={14} className="text-primary flex-shrink-0" />
                    <span className="text-sm font-bold text-on-surface">
                        {t('public.plans.credits_per_month', '{count} credits / month', {
                            count: plan.default_credits.toLocaleString(),
                        })}
                    </span>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                            {feature.included ? (
                                <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                        feature.highlight
                                            ? 'bg-primary text-white'
                                            : 'bg-primary/10 text-primary'
                                    }`}
                                >
                                    <Check size={11} strokeWidth={3} />
                                </span>
                            ) : (
                                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-surface-container text-outline-variant">
                                    <X size={11} strokeWidth={3} />
                                </span>
                            )}
                            <span
                                className={`text-sm leading-snug ${
                                    feature.included
                                        ? 'text-on-surface font-medium'
                                        : 'text-outline-variant'
                                }`}
                            >
                                {feature.text}
                            </span>
                        </li>
                    ))}
                </ul>

                <Link
                    href={ctaHref}
                    className={`block w-full text-center py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                        plan.is_popular
                            ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110'
                            : plan.is_free
                              ? 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                              : 'bg-on-surface text-surface hover:bg-on-surface/90'
                    }`}
                >
                    {plan.is_free
                        ? t('public.plans.cta.free', 'Get started free')
                        : t('public.plans.cta.paid', 'Get started')}
                </Link>
            </div>
        </motion.div>
    );
}

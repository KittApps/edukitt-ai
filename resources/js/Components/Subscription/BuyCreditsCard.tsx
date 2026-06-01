import { useState } from 'react';
import { motion } from 'framer-motion';
import { router } from '@inertiajs/react';
import { Coins, Check, Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCurrency } from '@/lib/settings';
import type { CreditPack } from './types';

interface Props {
    packs: CreditPack[];
}

export default function BuyCreditsCard({ packs }: Props) {
    const t = useT();
    const currency = useCurrency();
    const fmtMoney = (v: number) =>
        currency.format(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const initialId = packs.find((p) => p.badge === 'popular')?.id ?? packs[0]?.id ?? 0;
    const [selected, setSelected] = useState<number>(initialId);

    const activePack = packs.find((p) => p.id === selected) ?? packs[0];

    if (!activePack) return null;

    const handleBuy = () => {
        router.visit(`/app/subscription/credits/checkout/${activePack.id}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container p-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center">
                        <Coins size={20} className="text-tertiary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-headline font-extrabold text-on-surface">
                            {t('subscription.credits.buy_title', 'Buy Credits')}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            {t(
                                'subscription.credits.buy_subtitle',
                                'Top up anytime — credits never expire',
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
                {packs.map((pack, i) => {
                    const isActive = selected === pack.id;
                    return (
                        <motion.button
                            key={pack.id}
                            type="button"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.25 + i * 0.05 }}
                            onClick={() => setSelected(pack.id)}
                            className={`relative rounded-2xl p-5 text-center transition-all duration-200 border-2 ${
                                isActive
                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                    : 'border-surface-container bg-surface-container-low/40 hover:border-primary/20 hover:bg-surface-container-low'
                            }`}
                        >
                            {pack.badge === 'popular' && (
                                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {t('subscription.credits.badge_popular', 'Popular')}
                                </span>
                            )}
                            {pack.badge === 'best' && (
                                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-secondary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {t('subscription.credits.badge_best', 'Best Value')}
                                </span>
                            )}

                            {isActive && (
                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check size={11} className="text-white" strokeWidth={3} />
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Sparkles
                                    size={14}
                                    className={
                                        isActive
                                            ? 'text-primary'
                                            : 'text-on-surface-variant'
                                    }
                                />
                                <span className="text-2xl font-headline font-black text-on-surface tabular-nums">
                                    {pack.credits}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                                {t('subscription.credits.label_credits', 'Credits')}
                            </p>

                            <p className="text-lg font-headline font-black text-on-surface">
                                {fmtMoney(pack.price)}
                            </p>
                        </motion.button>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-container-low/50 rounded-2xl p-5">
                <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm text-on-surface-variant">
                        {t(
                            'subscription.credits.summary',
                            '{credits} credits for {price}',
                            {
                                credits: activePack.credits,
                                price: fmtMoney(activePack.price),
                            },
                        )}
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {t(
                            'subscription.credits.estimate',
                            'Credits never expire and apply to any AI feature.',
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleBuy}
                    disabled={!activePack.has_stripe_price}
                    title={
                        !activePack.has_stripe_price
                            ? t(
                                  'subscription.credits.not_configured',
                                  'This pack has not been wired to Stripe yet.',
                              )
                            : undefined
                    }
                    className="px-8 py-3 bg-gradient-to-r from-tertiary to-tertiary/80 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-tertiary/20 hover:shadow-tertiary/30 hover:brightness-110 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
                >
                    {t(
                        'subscription.credits.buy_cta',
                        'Buy {credits} Credits — {price}',
                        {
                            credits: activePack.credits,
                            price: fmtMoney(activePack.price),
                        },
                    )}
                </button>
            </div>
        </motion.div>
    );
}

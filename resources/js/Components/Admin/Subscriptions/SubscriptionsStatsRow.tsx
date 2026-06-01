import { CreditCard, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCurrency } from '@/lib/settings';
import type { SubscriptionsStats } from './types';

interface Props {
    stats: SubscriptionsStats;
}

export default function SubscriptionsStatsRow({ stats }: Props) {
    const t = useT();
    const currency = useCurrency();

    const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);
    const fmtMoney = (v: number) => currency.format(v, { maximumFractionDigits: 0 });

    const cards = [
        {
            label: t('admin.subscriptions.stats.total', 'Total subscribers'),
            value: fmtNum(stats.total),
            hint: t(
                'admin.subscriptions.stats.total_hint',
                '{managed} via Stripe',
                { managed: fmtNum(stats.stripe_managed) },
            ),
            icon: <CreditCard size={16} className="text-primary" />,
        },
        {
            label: t('admin.subscriptions.stats.active', 'Healthy'),
            value: fmtNum(stats.active),
            hint: t(
                'admin.subscriptions.stats.active_hint',
                '{trialing} trialing',
                { trialing: fmtNum(stats.trialing) },
            ),
            icon: <CheckCircle2 size={16} className="text-emerald-600" />,
        },
        {
            label: t('admin.subscriptions.stats.at_risk', 'At risk'),
            value: fmtNum(stats.past_due + stats.canceled),
            hint: t(
                'admin.subscriptions.stats.at_risk_hint',
                '{past_due} past due · {canceled} canceled',
                {
                    past_due: fmtNum(stats.past_due),
                    canceled: fmtNum(stats.canceled),
                },
            ),
            icon: <AlertTriangle size={16} className="text-amber-600" />,
        },
        {
            label: t('admin.subscriptions.stats.mrr', 'MRR'),
            value: fmtMoney(stats.mrr),
            hint: t(
                'admin.subscriptions.stats.mrr_hint',
                'monthly recurring revenue',
            ),
            icon: <TrendingUp size={16} className="text-tertiary" />,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center">
                            {c.icon}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {c.label}
                        </p>
                    </div>
                    <p className="mt-2 text-xl font-headline font-extrabold text-on-surface truncate">
                        {c.value}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                        {c.hint}
                    </p>
                </div>
            ))}
        </div>
    );
}

import { Award, Layers, Users, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/lib/settings';
import type { PlansStats } from './types';

interface Props {
    stats: PlansStats;
}

export default function PlansStatsRow({ stats }: Props) {
    const currency = useCurrency();
    const fmtMoney = (v: number) => currency.format(v, { maximumFractionDigits: 0 });
    const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

    const cards = [
        {
            label: 'Plans',
            value: `${stats.plans_active} / ${stats.plans_total}`,
            hint: 'active / total',
            icon: <Layers size={16} className="text-primary" />,
        },
        {
            label: 'Subscribers',
            value: fmtNum(stats.subscribers_total),
            hint: 'across all plans',
            icon: <Users size={16} className="text-secondary" />,
        },
        {
            label: 'MRR',
            value: fmtMoney(stats.mrr),
            hint: 'monthly recurring',
            icon: <TrendingUp size={16} className="text-tertiary" />,
        },
        {
            label: 'Most popular',
            value: 'Pro',
            hint: 'top conversion plan',
            icon: <Award size={16} className="text-on-surface-variant" />,
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
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">{c.hint}</p>
                </div>
            ))}
        </div>
    );
}

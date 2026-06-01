import { Activity, Coins, CreditCard, DollarSign } from 'lucide-react';

import { formatInt, formatMoney, percentOf } from './revenueUtils';
import type { Summary } from './types';

interface Props {
    summary: Summary;
}

export default function MetricsRow({ summary }: Props) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
                icon={<DollarSign size={16} />}
                label="Total Revenue"
                value={formatMoney(summary.total, summary.currency)}
                hint={`${formatInt(summary.transactions)} transactions`}
                accent="tertiary"
                emphasize
            />
            <MetricCard
                icon={<CreditCard size={16} />}
                label="Subscriptions"
                value={formatMoney(summary.subscriptions, summary.currency)}
                hint={`${percentOf(summary.subscriptions, summary.total)}% of total`}
                accent="primary"
            />
            <MetricCard
                icon={<Coins size={16} />}
                label="Credit Packs"
                value={formatMoney(summary.credit_packs, summary.currency)}
                hint={`${percentOf(summary.credit_packs, summary.total)}% of total`}
                accent="secondary"
            />
            <MetricCard
                icon={<Activity size={16} />}
                label="Avg / Transaction"
                value={formatMoney(summary.avg_transaction, summary.currency)}
                hint="across the range"
                accent="primary"
            />
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    hint,
    accent,
    emphasize,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint: string;
    accent: 'primary' | 'secondary' | 'tertiary';
    emphasize?: boolean;
}) {
    const accentClass =
        accent === 'primary'
            ? 'bg-primary/10 text-primary'
            : accent === 'secondary'
              ? 'bg-secondary/10 text-secondary'
              : 'bg-tertiary/10 text-tertiary';

    return (
        <div
            className={`rounded-2xl border p-5 ${
                emphasize
                    ? 'bg-surface-container-lowest border-tertiary/30'
                    : 'bg-surface-container-lowest border-surface-container'
            }`}
        >
            <div className="flex items-center gap-2 mb-3">
                <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${accentClass}`}
                >
                    {icon}
                </span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {label}
                </p>
            </div>
            <p className="text-2xl font-headline font-extrabold text-on-surface tabular-nums">
                {value}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">{hint}</p>
        </div>
    );
}

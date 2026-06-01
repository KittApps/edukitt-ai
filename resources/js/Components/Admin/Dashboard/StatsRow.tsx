import { Cpu, DollarSign, CreditCard, Users } from 'lucide-react';

import { formatInt, formatMoney } from '@/Components/Admin/Revenue';

import type { DashboardSummary } from './types';

interface Props {
    summary: DashboardSummary;
}

export default function StatsRow({ summary }: Props) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
                icon={<Users size={16} />}
                label="Users"
                value={formatInt(summary.users.total)}
                hint={`${formatInt(summary.users.verified)} verified · +${formatInt(summary.users.new_last_30)} new (30d)`}
                accent="primary"
                emphasize
            />
            <MetricCard
                icon={<CreditCard size={16} />}
                label="Active Subscriptions"
                value={formatInt(summary.subscriptions.active)}
                hint={`${formatInt(summary.subscriptions.paid_plans)} paid plans available`}
                accent="secondary"
            />
            <MetricCard
                icon={<DollarSign size={16} />}
                label="Total Revenue"
                value={formatMoney(summary.revenue.total, summary.revenue.currency)}
                hint={`${formatInt(summary.revenue.transactions)} transactions (all time)`}
                accent="tertiary"
            />
            <MetricCard
                icon={<Cpu size={16} />}
                label="AI Generations (30d)"
                value={formatInt(summary.ai.generations_last_30)}
                hint={`${compactTokens(summary.ai.tokens_last_30)} tokens used`}
                accent="primary"
            />
        </div>
    );
}

function compactTokens(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
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
                    ? 'bg-surface-container-lowest border-primary/30'
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

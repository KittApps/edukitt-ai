import { CreditCard } from 'lucide-react';

import SectionCard from '@/Components/Admin/AiTokensCost/SectionCard';

import BarChart, { type BarItem } from './BarChart';
import { formatInt, formatMoney } from './revenueUtils';
import type { PlanRow } from './types';

interface Props {
    rows: PlanRow[];
    currency?: string;
}

export default function PlansBreakdown({ rows, currency = 'USD' }: Props) {
    const total = rows.reduce((acc, r) => acc + r.revenue, 0);

    const bars: BarItem[] = rows.map((r) => ({
        label: r.plan,
        sublabel: labelForCycle(r.cycle),
        value: r.revenue,
        meta: { label: 'Sales', value: r.transactions },
    }));

    return (
        <SectionCard
            title="By Subscription Plan"
            subtitle="Revenue split across plans + billing cycle"
            icon={<CreditCard size={16} className="text-primary" />}
        >
            {rows.length === 0 ? (
                <EmptyHint />
            ) : (
                <>
                    <BarChart
                        bars={bars}
                        currency={currency}
                        color="primary"
                        gradientId="rev-bar-plans"
                        height={260}
                    />

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rows.map((r) => (
                            <BreakdownRow
                                key={`${r.plan}-${r.cycle}`}
                                title={r.plan}
                                subtitle={`${labelForCycle(r.cycle)} · ${formatInt(r.transactions)} ${r.transactions === 1 ? 'sale' : 'sales'}`}
                                value={r.revenue}
                                percent={total > 0 ? (r.revenue / total) * 100 : 0}
                                currency={currency}
                                color="var(--color-primary)"
                            />
                        ))}
                    </div>
                </>
            )}
        </SectionCard>
    );
}

function BreakdownRow({
    title,
    subtitle,
    value,
    currency,
}: {
    title: string;
    subtitle: string;
    value: number;
    percent: number;
    currency: string;
    color: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-container-low">
            <div className="min-w-0">
                <p className="text-xs font-bold text-on-surface truncate">{title}</p>
                <p className="text-[10px] text-on-surface-variant truncate">{subtitle}</p>
            </div>
            <p className="text-xs font-headline font-extrabold text-on-surface tabular-nums flex-shrink-0">
                {formatMoney(value, currency)}
            </p>
        </div>
    );
}

function EmptyHint() {
    return (
        <p className="text-xs text-on-surface-variant text-center py-6">
            No subscription sales in this range.
        </p>
    );
}

function labelForCycle(cycle: string): string {
    if (cycle === 'monthly') return 'Monthly';
    if (cycle === 'yearly') return 'Yearly';
    return cycle;
}

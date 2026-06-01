import { Coins } from 'lucide-react';

import SectionCard from '@/Components/Admin/AiTokensCost/SectionCard';

import BarChart, { type BarItem } from './BarChart';
import { formatInt, formatMoney } from './revenueUtils';
import type { PackageRow } from './types';

interface Props {
    rows: PackageRow[];
    currency?: string;
}

export default function PackagesBreakdown({ rows, currency = 'USD' }: Props) {
    const bars: BarItem[] = rows.map((r) => ({
        label: r.package,
        sublabel: `${formatInt(r.credits)} credits`,
        value: r.revenue,
        meta: { label: 'Sales', value: r.transactions },
    }));

    return (
        <SectionCard
            title="By Credit Pack"
            subtitle="Revenue from one-off credit purchases"
            icon={<Coins size={16} className="text-secondary" />}
        >
            {rows.length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-6">
                    No credit pack sales in this range.
                </p>
            ) : (
                <>
                    <BarChart
                        bars={bars}
                        currency={currency}
                        color="secondary"
                        gradientId="rev-bar-packs"
                        height={260}
                    />

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rows.map((r) => (
                            <div
                                key={r.package}
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-container-low"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-on-surface truncate">
                                        {r.package}
                                    </p>
                                    <p className="text-[10px] text-on-surface-variant truncate">
                                        {formatInt(r.transactions)}{' '}
                                        {r.transactions === 1 ? 'sale' : 'sales'} ·{' '}
                                        {formatInt(r.credits)} credits sold
                                    </p>
                                </div>
                                <p className="text-xs font-headline font-extrabold text-on-surface tabular-nums flex-shrink-0">
                                    {formatMoney(r.revenue, currency)}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </SectionCard>
    );
}

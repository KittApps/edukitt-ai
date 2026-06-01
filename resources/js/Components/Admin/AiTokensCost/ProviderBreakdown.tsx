import { TrendingUp } from 'lucide-react';
import SectionCard from './SectionCard';
import StackedBarChart from './StackedBarChart';
import { formatMoney, formatRate } from './costUtils';
import type { ProviderRow } from './types';

interface Props {
    rows: ProviderRow[];
    currency?: string;
}

export default function ProviderBreakdown({ rows, currency = 'USD' }: Props) {
    const bars = rows.map((r) => ({
        label: r.model,
        sublabel: r.provider,
        input: r.input_cost,
        output: r.output_cost,
    }));

    return (
        <SectionCard
            title="By Provider & Model"
            subtitle="Spend distribution across AI providers"
            icon={<TrendingUp size={16} className="text-secondary" />}
        >
            <StackedBarChart bars={bars} currency={currency} height={280} />

            <div className="mt-6 space-y-2">
                {rows.map((r) => {
                    const total = r.input_cost + r.output_cost;
                    return (
                        <div
                            key={`${r.provider}-${r.model}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-surface-container-low"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-on-surface truncate">
                                        {r.model}
                                    </p>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant whitespace-nowrap">
                                        {r.provider}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-on-surface-variant">
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        in {formatRate(r.input_rate, currency)}
                                    </span>
                                    <span className="text-surface-container">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                        out {formatRate(r.output_rate, currency)}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs font-headline font-extrabold text-on-surface tabular-nums">
                                    {formatMoney(total, currency)}
                                </p>
                                <p className="text-[10px] text-on-surface-variant">{r.runs} runs</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );
}

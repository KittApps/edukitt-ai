import { Cpu } from 'lucide-react';
import SectionCard from './SectionCard';
import StackedBarChart from './StackedBarChart';
import { formatFine, formatMoney } from './costUtils';
import type { ContentTypeRow } from './types';

interface Props {
    rows: ContentTypeRow[];
    currency?: string;
}

export default function ContentTypeBreakdown({ rows, currency = 'USD' }: Props) {
    const bars = rows.map((r) => ({
        label: r.label,
        sublabel: r.key,
        input: r.input_cost,
        output: r.output_cost,
    }));

    return (
        <SectionCard
            title="By Content Type"
            subtitle="Cost split across generation tasks"
            icon={<Cpu size={16} className="text-primary" />}
        >
            <StackedBarChart bars={bars} currency={currency} height={280} />

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rows.map((r) => {
                    const total = r.input_cost + r.output_cost;
                    const avg = total / Math.max(1, r.runs);
                    return (
                        <div
                            key={r.key}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-container-low"
                        >
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-on-surface truncate">
                                    {r.label}
                                </p>
                                <p className="text-[10px] text-on-surface-variant truncate">
                                    {r.runs} runs · avg {formatFine(avg, currency)}
                                </p>
                            </div>
                            <p className="text-xs font-headline font-extrabold text-on-surface tabular-nums flex-shrink-0">
                                {formatMoney(total, currency)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );
}

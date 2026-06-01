import { TrendingUp } from 'lucide-react';
import SectionCard from './SectionCard';
import StackedBarChart from './StackedBarChart';
import { formatNum } from './chartUtils';
import type { ProviderRow } from './types';

interface Props {
    rows: ProviderRow[];
}

export default function ProviderBreakdown({ rows }: Props) {
    const bars = rows.map((r) => ({
        label: r.model,
        sublabel: r.provider,
        input: r.input,
        output: r.output,
    }));

    return (
        <SectionCard
            title="By Provider & Model"
            subtitle="Usage split across AI providers"
            icon={<TrendingUp size={16} className="text-secondary" />}
        >
            <StackedBarChart bars={bars} height={280} />

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rows.map((r) => (
                    <div
                        key={`${r.provider}-${r.model}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-container-low"
                    >
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-on-surface truncate">
                                {r.model}
                            </p>
                            <p className="text-[10px] text-on-surface-variant truncate">
                                {r.provider} · {r.runs} runs
                            </p>
                        </div>
                        <p className="text-xs font-headline font-extrabold text-on-surface tabular-nums flex-shrink-0">
                            {formatNum(r.input + r.output)}
                        </p>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
}

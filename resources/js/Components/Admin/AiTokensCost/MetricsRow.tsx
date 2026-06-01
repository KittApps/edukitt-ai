import { ArrowDownToLine, ArrowUpFromLine, DollarSign, Activity } from 'lucide-react';
import { formatFine, formatMoney, percentOf } from './costUtils';
import type { Summary } from './types';

interface Props {
    summary: Summary;
}

export default function MetricsRow({ summary }: Props) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
                icon={<DollarSign size={16} />}
                label="Total Cost"
                value={formatMoney(summary.total_cost, summary.currency)}
                hint={`${summary.generation_count} generations`}
                accent="tertiary"
                emphasize
            />
            <MetricCard
                icon={<ArrowDownToLine size={16} />}
                label="Input Cost"
                value={formatMoney(summary.input_cost, summary.currency)}
                hint={`${percentOf(summary.input_cost, summary.total_cost)}% of total`}
                accent="primary"
            />
            <MetricCard
                icon={<ArrowUpFromLine size={16} />}
                label="Output Cost"
                value={formatMoney(summary.output_cost, summary.currency)}
                hint={`${percentOf(summary.output_cost, summary.total_cost)}% of total`}
                accent="secondary"
            />
            <MetricCard
                icon={<Activity size={16} />}
                label="Avg / Generation"
                value={formatFine(summary.avg_cost_per_run, summary.currency)}
                hint="cost per AI run"
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

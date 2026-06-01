import { ArrowDownToLine, ArrowUpFromLine, Sparkles, Activity } from 'lucide-react';
import { formatNum, percentOf } from './chartUtils';
import type { Summary } from './types';

interface Props {
    summary: Summary;
}

export default function MetricsRow({ summary }: Props) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
                icon={<Sparkles size={16} />}
                label="Total Tokens"
                value={formatNum(summary.total_tokens)}
                hint={`${formatNum(summary.generation_count)} generations`}
                accent="primary"
            />
            <MetricCard
                icon={<ArrowDownToLine size={16} />}
                label="Input Tokens"
                value={formatNum(summary.input_tokens)}
                hint={`${percentOf(summary.input_tokens, summary.total_tokens)}% of total`}
                accent="primary"
            />
            <MetricCard
                icon={<ArrowUpFromLine size={16} />}
                label="Output Tokens"
                value={formatNum(summary.output_tokens)}
                hint={`${percentOf(summary.output_tokens, summary.total_tokens)}% of total`}
                accent="secondary"
            />
            <MetricCard
                icon={<Activity size={16} />}
                label="Avg / Run"
                value={formatNum(summary.avg_tokens_per_run)}
                hint="tokens per generation"
                accent="tertiary"
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
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint: string;
    accent: 'primary' | 'secondary' | 'tertiary';
}) {
    const accentClass =
        accent === 'primary'
            ? 'bg-primary/10 text-primary'
            : accent === 'secondary'
              ? 'bg-secondary/10 text-secondary'
              : 'bg-tertiary/10 text-tertiary';

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-5">
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

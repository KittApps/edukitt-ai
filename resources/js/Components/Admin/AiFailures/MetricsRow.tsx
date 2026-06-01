import { AlertTriangle, Clock, Percent } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatInt, formatPercent } from './utils';
import type { Summary } from './types';

interface Props {
    summary: Summary;
}

export default function MetricsRow({ summary }: Props) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
                icon={<AlertTriangle size={16} />}
                label="Failed"
                value={formatInt(summary.failed)}
                hint="after retries exhausted"
                accent="error"
            />
            <MetricCard
                icon={<Clock size={16} />}
                label="Failed (last 24h)"
                value={formatInt(summary.failed_last_24h)}
                hint="rolling window from now"
                accent={summary.failed_last_24h > 0 ? 'error' : 'tertiary'}
                emphasize
            />
            <MetricCard
                icon={<Percent size={16} />}
                label="Failure Rate"
                value={formatPercent(summary.failure_rate)}
                hint="of total calls"
                accent={summary.failure_rate > 0 ? 'error' : 'tertiary'}
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
    icon: ReactNode;
    label: string;
    value: string;
    hint: string;
    accent: 'primary' | 'secondary' | 'tertiary' | 'error';
    emphasize?: boolean;
}) {
    const accentClass =
        accent === 'primary'
            ? 'bg-primary/10 text-primary'
            : accent === 'secondary'
              ? 'bg-secondary/10 text-secondary'
              : accent === 'tertiary'
                ? 'bg-tertiary/10 text-tertiary'
                : 'bg-error/10 text-error';

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

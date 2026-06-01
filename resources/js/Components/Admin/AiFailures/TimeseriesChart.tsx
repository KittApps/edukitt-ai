import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { compactInt, formatInt } from './utils';
import type { TimeseriesPoint } from './types';

interface Props {
    data: TimeseriesPoint[];
    height?: number;
}

/**
 * Daily failed AI calls as an area chart. The backend still reports
 * `successful` so we can compute a per-day failure rate for the
 * tooltip, but only the failed series is rendered — successful calls
 * are not part of the chart's visual story on this page.
 */
export default function TimeseriesChart({ data, height = 300 }: Props) {
    const chartData = data.map((d) => ({
        date: d.date,
        failed: d.failed,
        total: d.successful + d.failed,
    }));

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                    <defs>
                        <linearGradient id="ai-fail-ts-err" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-error)" stopOpacity={0.5} />
                            <stop
                                offset="100%"
                                stopColor="var(--color-error)"
                                stopOpacity={0.04}
                            />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        vertical={false}
                        stroke="var(--color-surface-container)"
                        strokeDasharray="3 4"
                    />

                    <XAxis
                        dataKey="date"
                        tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--color-surface-container)' }}
                        minTickGap={24}
                    />
                    <YAxis
                        tickFormatter={(v) => compactInt(v as number)}
                        tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        allowDecimals={false}
                    />

                    <Tooltip
                        cursor={{
                            stroke: 'var(--color-error)',
                            strokeOpacity: 0.3,
                            strokeWidth: 1,
                        }}
                        content={<FailuresTooltip />}
                    />

                    <Area
                        type="monotone"
                        dataKey="failed"
                        stroke="var(--color-error)"
                        strokeWidth={2}
                        fill="url(#ai-fail-ts-err)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-5 mt-2 px-2 flex-wrap">
                <Legend color="var(--color-error)" label="Failed calls" />
            </div>
        </div>
    );
}

function FailuresTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{
        payload?: { failed: number; total: number };
    }>;
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload ?? { failed: 0, total: 0 };
    const rate = row.total > 0 ? ((row.failed / row.total) * 100).toFixed(1) : '0.0';
    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[200px]">
            <p className="text-xs font-bold text-on-surface mb-2">{label}</p>
            <div className="space-y-1 text-xs">
                <Row
                    color="var(--color-error)"
                    label="Failed"
                    value={formatInt(row.failed)}
                />
                <div className="border-t border-surface-container pt-1 mt-1 flex justify-between text-on-surface-variant">
                    <span>Failure rate</span>
                    <span className="tabular-nums font-semibold text-error">{rate}%</span>
                </div>
            </div>
        </div>
    );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-on-surface-variant">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                {label}
            </span>
            <span className="font-semibold text-on-surface tabular-nums">{value}</span>
        </div>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
        </div>
    );
}

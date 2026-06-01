import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { compactNumber, formatNum } from './chartUtils';
import type { TimeseriesPoint } from './types';

interface Props {
    data: TimeseriesPoint[];
    height?: number;
}

/**
 * Stacked area chart showing input & output tokens over time. Uses
 * Recharts for responsive sizing, hover tooltips, and smooth animation.
 */
export default function TimeseriesChart({ data, height = 280 }: Props) {
    const chartData = data.map((d) => ({
        date: d.date,
        input: d.input,
        output: d.output,
        total: d.input + d.output,
    }));

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <AreaChart
                    data={chartData}
                    margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
                >
                    <defs>
                        <linearGradient id="ts-input" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.04} />
                        </linearGradient>
                        <linearGradient id="ts-output" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0.04} />
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
                        tickFormatter={(v) => compactNumber(v as number)}
                        tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                    />

                    <Tooltip
                        cursor={{
                            stroke: 'var(--color-primary)',
                            strokeOpacity: 0.3,
                            strokeWidth: 1,
                        }}
                        content={<TsTooltip />}
                    />

                    <Area
                        type="monotone"
                        dataKey="input"
                        stackId="1"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fill="url(#ts-input)"
                    />
                    <Area
                        type="monotone"
                        dataKey="output"
                        stackId="1"
                        stroke="var(--color-secondary)"
                        strokeWidth={2}
                        fill="url(#ts-output)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-5 mt-2 px-2 flex-wrap">
                <Legend color="var(--color-primary)" label="Input tokens" />
                <Legend color="var(--color-secondary)" label="Output tokens" />
            </div>
        </div>
    );
}

function TsTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload ?? {};
    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[180px]">
            <p className="text-xs font-bold text-on-surface mb-2">{label}</p>
            <div className="space-y-1 text-xs">
                <Row color="var(--color-primary)" label="Input" value={row.input} />
                <Row color="var(--color-secondary)" label="Output" value={row.output} />
                <div className="border-t border-surface-container pt-1 mt-1 flex justify-between">
                    <span className="font-bold text-on-surface">Total</span>
                    <span className="font-headline font-extrabold text-on-surface tabular-nums">
                        {formatNum(row.total ?? 0)}
                    </span>
                </div>
            </div>
        </div>
    );
}

function Row({ color, label, value }: { color: string; label: string; value: number }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-on-surface-variant">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                {label}
            </span>
            <span className="font-semibold text-on-surface tabular-nums">
                {formatNum(value ?? 0)}
            </span>
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

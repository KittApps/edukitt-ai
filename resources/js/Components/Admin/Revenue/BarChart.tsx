import {
    Bar,
    BarChart as RBarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { compactMoney, formatInt, formatMoney } from './revenueUtils';

export interface BarItem {
    label: string;
    sublabel?: string;
    value: number;
    /** Optional secondary count shown in the tooltip (transactions, credits…). */
    meta?: { label: string; value: number };
}

interface Props {
    bars: BarItem[];
    currency?: string;
    /** Tailwind CSS color variable used for the bar fill. */
    color?: 'primary' | 'secondary' | 'tertiary';
    height?: number;
    gradientId: string;
}

/**
 * Single-series bar chart styled to match the AI Tokens analytics
 * `StackedBarChart`. Revenue per item has no input/output split, so
 * the stack + total-line overlay don't apply here; everything else
 * (axes, ticks, tooltip card, legend) is intentionally identical.
 */
export default function BarChart({
    bars,
    currency = 'USD',
    color = 'primary',
    height = 280,
    gradientId,
}: Props) {
    const data = bars.map((b) => ({
        name: b.label,
        sub: b.sublabel,
        value: b.value,
        metaLabel: b.meta?.label,
        metaValue: b.meta?.value,
    }));

    const subByName: Record<string, string | undefined> = Object.fromEntries(
        bars.map((b) => [b.label, b.sublabel]),
    );

    const stroke = colorVar(color);

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <RBarChart
                    data={data}
                    margin={{ top: 24, right: 12, bottom: 8, left: 0 }}
                    barCategoryGap="28%"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={stroke} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={stroke} stopOpacity={0.75} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        vertical={false}
                        stroke="var(--color-surface-container)"
                        strokeDasharray="3 4"
                    />

                    <XAxis
                        dataKey="name"
                        tick={(props) => <BarTick {...props} dataMap={subByName} />}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--color-surface-container)' }}
                        height={48}
                        interval={0}
                    />
                    <YAxis
                        tickFormatter={(v) => compactMoney(v as number, currency)}
                        tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                    />

                    <Tooltip
                        cursor={{ fill: stroke, fillOpacity: 0.05 }}
                        content={<RevenueBarTooltip currency={currency} color={stroke} />}
                    />

                    <Bar
                        dataKey="value"
                        fill={`url(#${gradientId})`}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                    />
                </RBarChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-5 mt-1 px-2 flex-wrap">
                <LegendItem color={stroke} label="Revenue" />
            </div>
        </div>
    );
}

function colorVar(c: 'primary' | 'secondary' | 'tertiary'): string {
    return `var(--color-${c})`;
}

function BarTick(props: {
    x?: number | string;
    y?: number | string;
    payload?: { value: string };
    dataMap?: Record<string, string | undefined>;
}) {
    const { x = 0, y = 0, payload, dataMap } = props;
    const value = payload?.value ?? '';
    const sub = dataMap?.[value];
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={14}
                textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-on-surface)' }}
            >
                {clip(value, 16)}
            </text>
            {sub && (
                <text
                    x={0}
                    y={0}
                    dy={28}
                    textAnchor="middle"
                    style={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
                >
                    {clip(sub, 20)}
                </text>
            )}
        </g>
    );
}

function RevenueBarTooltip({
    active,
    payload,
    label,
    currency,
    color,
}: {
    active?: boolean;
    payload?: Array<{
        payload?: {
            value: number;
            sub?: string;
            metaLabel?: string;
            metaValue?: number;
        };
    }>;
    label?: string;
    currency: string;
    color: string;
}) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload ?? { value: 0 };
    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[200px]">
            <p className="text-xs font-bold text-on-surface">{label}</p>
            {row.sub && (
                <p className="text-[10px] text-on-surface-variant mb-2">{row.sub}</p>
            )}
            <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-on-surface-variant">
                        <span
                            className="w-2 h-2 rounded-sm"
                            style={{ backgroundColor: color }}
                        />
                        Revenue
                    </span>
                    <span className="font-headline font-extrabold text-on-surface tabular-nums">
                        {formatMoney(row.value, currency)}
                    </span>
                </div>
                {row.metaLabel !== undefined && row.metaValue !== undefined && (
                    <div className="flex items-center justify-between gap-4 border-t border-surface-container pt-1 mt-1">
                        <span className="text-on-surface-variant">{row.metaLabel}</span>
                        <span className="font-semibold text-on-surface tabular-nums">
                            {formatInt(row.metaValue)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
        </div>
    );
}

function clip(s: string, max: number): string {
    if (!s) return '';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

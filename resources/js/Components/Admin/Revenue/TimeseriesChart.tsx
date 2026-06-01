import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { compactMoney, formatMoney } from './revenueUtils';
import type { TimeseriesPoint } from './types';

interface Props {
    data: TimeseriesPoint[];
    currency?: string;
    height?: number;
}

/**
 * Daily revenue split into subscriptions vs credit packs as a stacked
 * area chart. Matches the visual language of `AiTokensCost`'s
 * `TimeseriesChart` so the two analytics pages feel like one family.
 */
export default function TimeseriesChart({ data, currency = 'USD', height = 300 }: Props) {
    const chartData = data.map((d) => ({
        date: d.date,
        subscriptions: d.subscriptions,
        credit_packs: d.credit_packs,
        total: d.subscriptions + d.credit_packs,
    }));

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                    <defs>
                        <linearGradient id="rev-ts-subs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                            <stop
                                offset="100%"
                                stopColor="var(--color-primary)"
                                stopOpacity={0.04}
                            />
                        </linearGradient>
                        <linearGradient id="rev-ts-packs" x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="0%"
                                stopColor="var(--color-secondary)"
                                stopOpacity={0.45}
                            />
                            <stop
                                offset="100%"
                                stopColor="var(--color-secondary)"
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
                        tickFormatter={(v) => compactMoney(v as number, currency)}
                        tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                    />

                    <Tooltip
                        cursor={{
                            stroke: 'var(--color-primary)',
                            strokeOpacity: 0.3,
                            strokeWidth: 1,
                        }}
                        content={<RevenueTooltip currency={currency} />}
                    />

                    <Area
                        type="monotone"
                        dataKey="subscriptions"
                        stackId="1"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fill="url(#rev-ts-subs)"
                    />
                    <Area
                        type="monotone"
                        dataKey="credit_packs"
                        stackId="1"
                        stroke="var(--color-secondary)"
                        strokeWidth={2}
                        fill="url(#rev-ts-packs)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-5 mt-2 px-2 flex-wrap">
                <Legend color="var(--color-primary)" label="Subscriptions" />
                <Legend color="var(--color-secondary)" label="Credit packs" />
            </div>
        </div>
    );
}

function RevenueTooltip({
    active,
    payload,
    label,
    currency,
}: {
    active?: boolean;
    payload?: Array<{
        payload?: { subscriptions: number; credit_packs: number; total: number };
    }>;
    label?: string;
    currency: string;
}) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload ?? { subscriptions: 0, credit_packs: 0, total: 0 };
    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[220px]">
            <p className="text-xs font-bold text-on-surface mb-2">{label}</p>
            <div className="space-y-1 text-xs">
                <Row
                    color="var(--color-primary)"
                    label="Subscriptions"
                    value={formatMoney(row.subscriptions, currency)}
                />
                <Row
                    color="var(--color-secondary)"
                    label="Credit packs"
                    value={formatMoney(row.credit_packs, currency)}
                />
                <div className="border-t border-surface-container pt-1 mt-1 flex justify-between">
                    <span className="font-bold text-on-surface">Total</span>
                    <span className="font-headline font-extrabold text-on-surface tabular-nums">
                        {formatMoney(row.total, currency)}
                    </span>
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

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import type { RegistrationPoint } from './types';

interface Props {
    data: RegistrationPoint[];
    height?: number;
}

/**
 * Daily new-user registrations as a single-series area chart. Styled
 * identically to the AiTokensCost / Revenue timeseries charts so the
 * Dashboard sits visually inside the same analytics family.
 */
export default function RegistrationsChart({ data, height = 280 }: Props) {
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                    <defs>
                        <linearGradient id="dash-reg-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                            <stop
                                offset="100%"
                                stopColor="var(--color-primary)"
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
                        allowDecimals={false}
                        tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                    />

                    <Tooltip
                        cursor={{
                            stroke: 'var(--color-primary)',
                            strokeOpacity: 0.3,
                            strokeWidth: 1,
                        }}
                        content={<RegistrationsTooltip />}
                    />

                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fill="url(#dash-reg-gradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-5 mt-2 px-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                    />
                    <span className="text-xs font-semibold text-on-surface-variant">
                        New users
                    </span>
                </div>
            </div>
        </div>
    );
}

function RegistrationsTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ payload?: { count: number } }>;
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) return null;
    const count = payload[0]?.payload?.count ?? 0;
    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[160px]">
            <p className="text-xs font-bold text-on-surface mb-1">{label}</p>
            <div className="flex items-center justify-between gap-4 text-xs">
                <span className="flex items-center gap-2 text-on-surface-variant">
                    <span
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                    />
                    New users
                </span>
                <span className="font-headline font-extrabold text-on-surface tabular-nums">
                    {count}
                </span>
            </div>
        </div>
    );
}

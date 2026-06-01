import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { compactNumber, formatNum } from './chartUtils';

interface BarItem {
    label: string;
    sublabel?: string;
    input: number;
    output: number;
}

interface Props {
    bars: BarItem[];
    height?: number;
}

/**
 * Stacked bar chart (input + output tokens) with a total-line overlay,
 * built on Recharts' ComposedChart. Hover to see tooltips per bar.
 */
export default function StackedBarChart({ bars, height = 320 }: Props) {
    const data = bars.map((b) => ({
        name: b.label,
        sub: b.sublabel,
        input: b.input,
        output: b.output,
        total: b.input + b.output,
    }));

    const subByName: Record<string, string | undefined> = Object.fromEntries(
        bars.map((b) => [b.label, b.sublabel]),
    );

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <ComposedChart
                    data={data}
                    margin={{ top: 24, right: 12, bottom: 8, left: 0 }}
                    barCategoryGap="28%"
                >
                    <defs>
                        <linearGradient id="bar-input" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.75} />
                        </linearGradient>
                        <linearGradient id="bar-output" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0.75} />
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
                        tickFormatter={(v) => compactNumber(v as number)}
                        tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                    />

                    <Tooltip
                        cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }}
                        content={<BreakdownTooltip />}
                    />

                    <Bar
                        dataKey="input"
                        stackId="tokens"
                        fill="url(#bar-input)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={48}
                    />
                    <Bar
                        dataKey="output"
                        stackId="tokens"
                        fill="url(#bar-output)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                    />

                    <Line
                        type="monotone"
                        dataKey="total"
                        stroke="var(--color-tertiary)"
                        strokeWidth={2.5}
                        dot={{
                            r: 4,
                            stroke: 'var(--color-tertiary)',
                            strokeWidth: 2,
                            fill: 'var(--color-surface-container-lowest)',
                        }}
                        activeDot={{
                            r: 5,
                            stroke: 'var(--color-tertiary)',
                            strokeWidth: 2,
                            fill: 'var(--color-surface-container-lowest)',
                        }}
                    />
                </ComposedChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-5 mt-1 px-2 flex-wrap">
                <LegendItem color="var(--color-primary)" label="Input tokens" />
                <LegendItem color="var(--color-secondary)" label="Output tokens" />
                <LegendItem color="var(--color-tertiary)" label="Total" line />
            </div>
        </div>
    );
}

function BarTick(props: any) {
    const { x, y, payload, dataMap } = props;
    const sub = dataMap?.[payload?.value];
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={14}
                textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-on-surface)' }}
            >
                {clip(payload.value, 16)}
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

function BreakdownTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload ?? {};
    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[180px]">
            <p className="text-xs font-bold text-on-surface">{label}</p>
            {row.sub && <p className="text-[10px] text-on-surface-variant mb-2">{row.sub}</p>}
            <div className="space-y-1 text-xs">
                <TooltipRow color="var(--color-primary)" label="Input" value={row.input} />
                <TooltipRow color="var(--color-secondary)" label="Output" value={row.output} />
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

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
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

function LegendItem({ color, label, line }: { color: string; label: string; line?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            {line ? (
                <span className="flex items-center">
                    <span
                        className="w-4 h-[2px] rounded-full"
                        style={{ backgroundColor: color }}
                    />
                    <span
                        className="w-1.5 h-1.5 rounded-full ml-[-4px] border-2"
                        style={{
                            borderColor: color,
                            backgroundColor: 'var(--color-surface-container-lowest)',
                        }}
                    />
                </span>
            ) : (
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            )}
            <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
        </div>
    );
}

function clip(s: string, max: number) {
    if (!s) return '';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

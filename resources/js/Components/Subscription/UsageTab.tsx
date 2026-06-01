import { motion } from 'framer-motion';
import { Activity, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { router } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useMemo } from 'react';

import { useT } from '@/lib/i18n';
import type { UsageChartPoint, UsageData } from './types';

interface Props {
    usage: UsageData;
}

/**
 * Bar palette: a fresh, vibrant set of distinct hues with comparable
 * saturation so no single task visually dominates. Mapping is
 * deterministic by sorted `task_type` index so the legend stays stable
 * across renders.
 */
const TASK_COLORS = [
    '#4f46e5', // indigo
    '#0d9488', // teal
    '#ea580c', // orange
    '#db2777', // pink
    '#65a30d', // lime
    '#2563eb', // blue
    '#9333ea', // purple
];

const colorFor = (index: number): string => TASK_COLORS[index % TASK_COLORS.length];

const fmtDay = (iso: string): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
};

export default function UsageTab({ usage }: Props) {
    const t = useT();
    const { chart } = usage;

    const goToMonth = (yearMonth: string): void => {
        router.reload({
            only: ['usage'],
            data: { month: yearMonth, tab: 'usage' },
        });
    };

    const colorByTask = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        chart.taskTypes.forEach((taskType, idx) => {
            map[taskType] = colorFor(idx);
        });
        return map;
    }, [chart.taskTypes]);

    const hasData = chart.totalCredits > 0;

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface-container-lowest rounded-2xl border border-surface-container p-8"
            >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Activity size={20} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-headline font-extrabold text-on-surface">
                                {t('subscription.usage.title', 'Credit usage')}
                            </h3>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                {chart.period.label}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => goToMonth(chart.period.prev)}
                            aria-label={t('subscription.usage.prev_month', 'Previous month')}
                            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => goToMonth(chart.period.next)}
                            aria-label={t('subscription.usage.next_month', 'Next month')}
                            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <div className="flex items-center gap-2 bg-primary/8 px-3 py-1.5 rounded-lg ml-1">
                            <Sparkles size={14} className="text-primary" />
                            <span className="text-sm font-bold text-primary tabular-nums">
                                {t(
                                    'subscription.usage.total_credits',
                                    '{count} credits',
                                    { count: chart.totalCredits },
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {hasData ? (
                    <div className="space-y-5">
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <BarChart
                                    data={chart.series}
                                    margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid
                                        vertical={false}
                                        stroke="var(--color-surface-container)"
                                        strokeDasharray="3 4"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={fmtDay}
                                        tick={{
                                            fill: 'var(--color-on-surface-variant)',
                                            fontSize: 11,
                                        }}
                                        tickLine={false}
                                        axisLine={{ stroke: 'var(--color-surface-container)' }}
                                        minTickGap={24}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{
                                            fill: 'var(--color-on-surface-variant)',
                                            fontSize: 11,
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={40}
                                    />
                                    <Tooltip
                                        cursor={{
                                            stroke: 'var(--color-primary)',
                                            strokeOpacity: 0.3,
                                            strokeWidth: 1,
                                        }}
                                        content={
                                            <UsageTooltip
                                                taskTypes={chart.taskTypes}
                                                taskLabels={chart.taskLabels}
                                                colorByTask={colorByTask}
                                                t={t}
                                            />
                                        }
                                    />
                                    {chart.taskTypes.map((taskType, idx) => (
                                        <Bar
                                            key={taskType}
                                            dataKey={taskType}
                                            stackId="usage"
                                            fill={colorByTask[taskType]}
                                            radius={
                                                idx === chart.taskTypes.length - 1
                                                    ? [4, 4, 0, 0]
                                                    : [0, 0, 0, 0]
                                            }
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {chart.taskTypes.map((taskType) => {
                                const total = chart.totals[taskType] ?? 0;
                                if (total === 0) return null;
                                const label = t(
                                    `subscription.task.${taskType}`,
                                    chart.taskLabels[taskType] ?? taskType,
                                );
                                return (
                                    <div
                                        key={taskType}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        <span
                                            className="w-3 h-3 rounded-sm"
                                            style={{ backgroundColor: colorByTask[taskType] }}
                                        />
                                        <span className="font-semibold text-on-surface-variant">
                                            {label}
                                        </span>
                                        <span className="font-bold text-on-surface tabular-nums">
                                            {total}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="py-16 text-center text-sm text-on-surface-variant">
                        {t(
                            'subscription.usage.empty',
                            'No credit usage this month yet.',
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

interface TooltipPayloadEntry {
    dataKey?: string | number;
    value?: number;
    payload?: UsageChartPoint;
}

interface UsageTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
    taskTypes: string[];
    taskLabels: Record<string, string>;
    colorByTask: Record<string, string>;
    t: (key: string, fallback?: string, replace?: Record<string, string | number>) => string;
}

function UsageTooltip({
    active,
    payload,
    label,
    taskTypes,
    taskLabels,
    colorByTask,
    t,
}: UsageTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    const rows = taskTypes
        .map((taskType) => ({
            taskType,
            value: Number(point[taskType] ?? 0),
        }))
        .filter((row) => row.value > 0);

    const total = rows.reduce((acc, row) => acc + row.value, 0);

    if (total === 0) {
        return (
            <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[180px]">
                <p className="text-xs font-bold text-on-surface mb-1">
                    {label ? fmtDay(label) : ''}
                </p>
                <p className="text-xs text-on-surface-variant">
                    {t('subscription.usage.no_credits_day', 'No credits used.')}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3 min-w-[200px]">
            <p className="text-xs font-bold text-on-surface mb-2">
                {label ? fmtDay(label) : ''}
            </p>
            <div className="space-y-1 text-xs">
                {rows.map((row) => (
                    <div
                        key={row.taskType}
                        className="flex items-center justify-between gap-4"
                    >
                        <span className="flex items-center gap-2 text-on-surface-variant">
                            <span
                                className="w-2 h-2 rounded-sm"
                                style={{ backgroundColor: colorByTask[row.taskType] }}
                            />
                            {t(
                                `subscription.task.${row.taskType}`,
                                taskLabels[row.taskType] ?? row.taskType,
                            )}
                        </span>
                        <span className="font-semibold text-on-surface tabular-nums">
                            {row.value}
                        </span>
                    </div>
                ))}
                <div className="border-t border-surface-container pt-1 mt-1 flex justify-between">
                    <span className="font-bold text-on-surface">
                        {t('subscription.usage.total_label', 'Total')}
                    </span>
                    <span className="font-headline font-extrabold text-on-surface tabular-nums">
                        {total}
                    </span>
                </div>
            </div>
        </div>
    );
}

import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { AlertTriangle, Trash2, TrendingUp } from 'lucide-react';

import SectionCard from '@/Components/Admin/AiTokensCost/SectionCard';
import {
    ErrorsTable,
    MetricsRow,
    TimeseriesChart,
    type ErrorRow,
    type Summary,
    type TimeseriesPoint,
} from '@/Components/Admin/AiFailures';
import {
    DateRangeFilter,
    PageHeader,
    parseRangeFromQuery,
    rangeToQuery,
    type RangeValue,
} from '@/Components/Admin/Shared';
import AdminLayout from '@/Layouts/AdminLayout';

interface Props {
    range: { start_date: string; end_date: string };
    summary: Summary;
    timeseries: TimeseriesPoint[];
    latestErrors: ErrorRow[];
}

export default function AiFailures({ range, summary, timeseries, latestErrors }: Props) {
    const value: RangeValue = parseRangeFromQuery(range.start_date, range.end_date);

    const handleApply = (next: RangeValue) => {
        router.get('/admin/analytics/ai-failures', rangeToQuery(next), {
            preserveState: false,
        });
    };

    const handleClearErrors = () => {
        if (!confirm('Clear all AI failure records? This cannot be undone.')) return;
        router.delete('/admin/analytics/ai-failures/errors', { preserveScroll: true });
    };

    const subtitle = `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`;

    return (
        <AdminLayout>
            <Head title="AI Failures" />

            <div className="space-y-6">
                <PageHeader
                    title="AI Failures"
                    description="Daily AI provider call success / failure rates and the latest error details."
                    actions={<DateRangeFilter value={value} onApply={handleApply} />}
                />

                <MetricsRow summary={summary} />

                <SectionCard
                    title="Failures Over Time"
                    subtitle={subtitle}
                    icon={<TrendingUp size={16} className="text-error" />}
                >
                    <TimeseriesChart data={timeseries} height={300} />
                </SectionCard>

                <SectionCard
                    title="Latest Errors"
                    subtitle={`Showing up to 25 most recent failures (${latestErrors.length} loaded)`}
                    icon={<AlertTriangle size={16} className="text-error" />}
                    action={
                        latestErrors.length > 0 ? (
                            <button
                                onClick={handleClearErrors}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10 border border-error/30 rounded-lg transition-colors"
                            >
                                <Trash2 size={13} /> Clear
                            </button>
                        ) : undefined
                    }
                >
                    <ErrorsTable errors={latestErrors} />
                </SectionCard>
            </div>
        </AdminLayout>
    );
}

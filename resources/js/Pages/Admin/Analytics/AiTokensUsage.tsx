import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { Activity } from 'lucide-react';

import {
    DateRangeFilter,
    PageHeader,
    parseRangeFromQuery,
    rangeToQuery,
    type RangeValue,
} from '@/Components/Admin/Shared';
import {
    ContentTypeBreakdown,
    MetricsRow,
    ProviderBreakdown,
    SectionCard,
    TimeseriesChart,
    TopUsersTable,
    type ContentTypeRow,
    type ProviderRow,
    type Summary,
    type TimeseriesPoint,
    type TopUserRow,
} from '@/Components/Admin/AiTokensUsage';
import { format } from 'date-fns';

interface Props {
    range: { start_date: string; end_date: string };
    summary: Summary;
    timeseries: TimeseriesPoint[];
    byContentType: ContentTypeRow[];
    byProvider: ProviderRow[];
    topUsers: TopUserRow[];
}

export default function AiTokensUsage({
    range,
    summary,
    timeseries,
    byContentType,
    byProvider,
    topUsers,
}: Props) {
    const value: RangeValue = parseRangeFromQuery(range.start_date, range.end_date);

    const handleApply = (next: RangeValue) => {
        router.get('/admin/analytics/ai-tokens-usage', rangeToQuery(next), {
            preserveState: false,
        });
    };

    const subtitle = `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`;

    return (
        <AdminLayout>
            <Head title="AI Tokens Usage" />

            <div className="space-y-6">
                <PageHeader
                    title="AI Tokens Usage"
                    description="Input/output token consumption across content types, providers, and users."
                    actions={<DateRangeFilter value={value} onApply={handleApply} />}
                />

                <MetricsRow summary={summary} />

                <SectionCard
                    title="Tokens Over Time"
                    subtitle={subtitle}
                    icon={<Activity size={16} className="text-primary" />}
                >
                    <TimeseriesChart data={timeseries} height={300} />
                </SectionCard>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ContentTypeBreakdown rows={byContentType} />
                    <ProviderBreakdown rows={byProvider} />
                </div>

                <TopUsersTable users={topUsers} />

               
            </div>
        </AdminLayout>
    );
}

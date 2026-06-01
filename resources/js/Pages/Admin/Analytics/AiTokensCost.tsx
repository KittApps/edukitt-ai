import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { TrendingUp } from 'lucide-react';

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
} from '@/Components/Admin/AiTokensCost';
import { format } from 'date-fns';

interface Props {
    range: { start_date: string; end_date: string };
    summary: Summary;
    timeseries: TimeseriesPoint[];
    byContentType: ContentTypeRow[];
    byProvider: ProviderRow[];
    topUsers: TopUserRow[];
}

export default function AiTokensCost({
    range,
    summary,
    timeseries,
    byContentType,
    byProvider,
    topUsers,
}: Props) {
    const value: RangeValue = parseRangeFromQuery(range.start_date, range.end_date);

    const handleApply = (next: RangeValue) => {
        router.get('/admin/analytics/ai-tokens-cost', rangeToQuery(next), {
            preserveState: false,
        });
    };

    const subtitle = `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`;

    return (
        <AdminLayout>
            <Head title="AI Tokens Cost" />

            <div className="space-y-6">
                <PageHeader
                    title="AI Tokens Cost"
                    description="Spend analysis across content types, providers, and users."
                    actions={<DateRangeFilter value={value} onApply={handleApply} />}
                />

                <MetricsRow summary={summary} />

                <SectionCard
                    title="Cost Over Time"
                    subtitle={subtitle}
                    icon={<TrendingUp size={16} className="text-tertiary" />}
                >
                    <TimeseriesChart
                        data={timeseries}
                        currency={summary.currency}
                        height={300}
                    />
                </SectionCard>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ContentTypeBreakdown rows={byContentType} currency={summary.currency} />
                    <ProviderBreakdown rows={byProvider} currency={summary.currency} />
                </div>

                <TopUsersTable users={topUsers} currency={summary.currency} />

                
            </div>
        </AdminLayout>
    );
}

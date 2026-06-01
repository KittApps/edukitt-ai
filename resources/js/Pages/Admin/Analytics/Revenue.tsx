import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

import SectionCard from '@/Components/Admin/AiTokensCost/SectionCard';
import {
    DateRangeFilter,
    PageHeader,
    parseRangeFromQuery,
    rangeToQuery,
    type RangeValue,
} from '@/Components/Admin/Shared';
import {
    MetricsRow,
    PackagesBreakdown,
    PlansBreakdown,
    TimeseriesChart,
    type PackageRow,
    type PlanRow,
    type Summary,
    type TimeseriesPoint,
} from '@/Components/Admin/Revenue';
import AdminLayout from '@/Layouts/AdminLayout';

interface Props {
    range: { start_date: string; end_date: string };
    summary: Summary;
    timeseries: TimeseriesPoint[];
    byPlan: PlanRow[];
    byPackage: PackageRow[];
}

export default function Revenue({
    range,
    summary,
    timeseries,
    byPlan,
    byPackage,
}: Props) {
    const value: RangeValue = parseRangeFromQuery(range.start_date, range.end_date);

    const handleApply = (next: RangeValue) => {
        router.get('/admin/analytics/revenue', rangeToQuery(next), {
            preserveState: false,
        });
    };

    const subtitle = `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`;

    return (
        <AdminLayout>
            <Head title="Revenue" />

            <div className="space-y-6">
                <PageHeader
                    title="Revenue"
                    description="Daily revenue from subscription plans and credit pack purchases."
                    actions={<DateRangeFilter value={value} onApply={handleApply} />}
                />

                <MetricsRow summary={summary} />

                <SectionCard
                    title="Revenue Over Time"
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
                    <PlansBreakdown rows={byPlan} currency={summary.currency} />
                    <PackagesBreakdown rows={byPackage} currency={summary.currency} />
                </div>
            </div>
        </AdminLayout>
    );
}

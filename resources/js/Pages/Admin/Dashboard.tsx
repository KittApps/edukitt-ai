import { Head } from '@inertiajs/react';
import { TrendingUp } from 'lucide-react';

import SectionCard from '@/Components/Admin/AiTokensCost/SectionCard';
import {
    RecentTransactionsList,
    RecentUsersList,
    RegistrationsChart,
    StatsRow,
    type DashboardSummary,
    type RecentTransactionRow,
    type RecentUserRow,
    type RegistrationPoint,
} from '@/Components/Admin/Dashboard';
import { PageHeader } from '@/Components/Admin/Shared';
import AdminLayout from '@/Layouts/AdminLayout';

interface Props {
    summary: DashboardSummary;
    registrations: RegistrationPoint[];
    recentUsers: RecentUserRow[];
    recentTransactions: RecentTransactionRow[];
}

export default function Dashboard({
    summary,
    registrations,
    recentUsers,
    recentTransactions,
}: Props) {
    return (
        <AdminLayout>
            <Head title="Admin Dashboard" />

            <div className="space-y-6">
                <PageHeader
                    title="Dashboard"
                    description="A quick snapshot of users, revenue and AI activity across the platform."
                />

                <StatsRow summary={summary} />

                <SectionCard
                    title="User Registrations"
                    subtitle="Last 30 days"
                    icon={<TrendingUp size={16} className="text-primary" />}
                >
                    <RegistrationsChart data={registrations} height={280} />
                </SectionCard>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <RecentUsersList users={recentUsers} />
                    <RecentTransactionsList transactions={recentTransactions} />
                </div>
            </div>
        </AdminLayout>
    );
}

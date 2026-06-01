import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';

import { PageHeader } from '@/Components/Admin/Shared';
import {
    PlansStatsRow,
    PlansTable,
    type Plan,
    type PlansStats,
} from '@/Components/Admin/SubscriptionPlans';

interface Props {
    plans: Plan[];
    defaultPlanId: number | null;
    stats: PlansStats;
}

export default function SubscriptionPlansIndex({ plans, stats }: Props) {
    const handleMakeDefault = (plan: Plan) => {
        if (plan.id !== null) {
            router.post(`/admin/subscription-plans/${plan.id}/make-default`);
        }
    };

    const handleDelete = (plan: Plan) => {
        if (plan.id === null) return;
        if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
        router.delete(`/admin/subscription-plans/${plan.id}`);
    };

    return (
        <AdminLayout>
            <Head title="Subscription Plans" />

            <div className="space-y-6">
                <PageHeader
                    title="Subscription Plans"
                    description="Configure pricing, credits and feature limits for each plan."
                    actions={
                        <Link
                            href="/admin/subscription-plans/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all"
                        >
                            <Plus size={14} /> New plan
                        </Link>
                    }
                />

                <PlansStatsRow stats={stats} />

                <PlansTable
                    plans={plans}
                    onDelete={handleDelete}
                    onMakeDefault={handleMakeDefault}
                />
            </div>
        </AdminLayout>
    );
}

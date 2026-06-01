import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import { PageHeader, Pagination } from '@/Components/Admin/Shared';
import { FlashBanner } from '@/Components/Admin/Users/Form';
import {
    SubscriptionsFiltersBar,
    SubscriptionsStatsRow,
    SubscriptionsTable,
    type SubscriptionsFilters,
    type SubscriptionsPaginated,
    type SubscriptionsPlanOption,
    type SubscriptionsStats,
} from '@/Components/Admin/Subscriptions';
import { useT } from '@/lib/i18n';

interface Props {
    subscriptions: SubscriptionsPaginated;
    stats: SubscriptionsStats;
    filters: SubscriptionsFilters;
    plans: SubscriptionsPlanOption[];
}

export default function SubscriptionsIndex({
    subscriptions,
    stats,
    filters: initialFilters,
    plans,
}: Props) {
    const t = useT();

    const [filters, setFilters] = useState<SubscriptionsFilters>(initialFilters);
    const isFirstRender = useRef(true);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (searchDebounce.current) {
            clearTimeout(searchDebounce.current);
        }

        searchDebounce.current = setTimeout(() => {
            router.get(
                window.location.pathname,
                {
                    q: filters.q,
                    plan: filters.plan,
                    status: filters.status,
                    term: filters.term,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['subscriptions', 'filters'],
                },
            );
        }, 300);

        return () => {
            if (searchDebounce.current) {
                clearTimeout(searchDebounce.current);
            }
        };
    }, [filters]);

    const goPage = (page: number) => {
        router.get(
            window.location.pathname,
            {
                q: filters.q,
                plan: filters.plan,
                status: filters.status,
                term: filters.term,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['subscriptions'],
            },
        );
    };

    const { data, meta } = subscriptions;

    return (
        <AdminLayout>
            <Head title={t('admin.subscriptions.head_title', 'Subscriptions')} />

            <div className="space-y-6">
                <PageHeader
                    title={t('admin.subscriptions.title', 'Subscriptions')}
                    description={t(
                        'admin.subscriptions.description',
                        'Paid subscribers across Stripe and admin grants. Click edit to manage a user\u2019s plan, billing window, or credits.',
                    )}
                />

                <FlashBanner />

                <SubscriptionsStatsRow stats={stats} />

                <SubscriptionsFiltersBar
                    value={filters}
                    plans={plans}
                    onChange={setFilters}
                />

                <SubscriptionsTable subscriptions={data} />

                <Pagination meta={meta} onPageChange={goPage} />
            </div>
        </AdminLayout>
    );
}

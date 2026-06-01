import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

import { PageHeader, Pagination } from '@/Components/Admin/Shared';
import {
    UsersFiltersBar,
    UsersStatsRow,
    UsersTable,
    type PlanOption,
    type UserRow,
    type UsersFilters,
    type UsersPaginated,
    type UsersStats,
} from '@/Components/Admin/Users';
import { FlashBanner } from '@/Components/Admin/Users/Form';
import { useT } from '@/lib/i18n';

interface Props {
    users: UsersPaginated;
    filters: UsersFilters;
    plans: PlanOption[];
    stats: UsersStats;
}

export default function UsersIndex({
    users,
    filters: initialFilters,
    plans,
    stats,
}: Props) {
    const t = useT();

    const [filters, setFilters] = useState<UsersFilters>(initialFilters);
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
                    role: filters.role,
                    plan: filters.plan,
                    verified: filters.verified,
                    status: filters.status,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['users', 'filters'],
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
                role: filters.role,
                plan: filters.plan,
                verified: filters.verified,
                status: filters.status,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['users'],
            },
        );
    };

    const handleDelete = (user: UserRow) => {
        const message = t(
            'admin.users.confirm_delete',
            'Delete user "{name}"? This cannot be undone.',
            { name: user.name },
        );
        // window.confirm matches the dialog used by SubscriptionPlans and
        // CreditPackages on this same admin surface — kept here so users
        // never see two different confirmation styles across the panel.
        if (!confirm(message)) return;
        router.delete(`/admin/users/${user.id}`, {
            preserveScroll: true,
        });
    };

    const { data, meta } = users;

    return (
        <AdminLayout>
            <Head title={t('admin.users.head_title', 'Users')} />

            <div className="space-y-6">
                <PageHeader
                    title={t('admin.users.title', 'Users')}
                    description={t(
                        'admin.users.description',
                        'Manage registered users.',
                    )}
                    actions={
                        <Link
                            href="/admin/users/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all"
                        >
                            <Plus size={14} />{' '}
                            {t('admin.users.new', 'New user')}
                        </Link>
                    }
                />

                <FlashBanner />

                <UsersStatsRow stats={stats} />

                <UsersFiltersBar
                    value={filters}
                    plans={plans}
                    onChange={setFilters}
                />

                <UsersTable users={data} onDelete={handleDelete} />

                <Pagination meta={meta} onPageChange={goPage} />
            </div>
        </AdminLayout>
    );
}

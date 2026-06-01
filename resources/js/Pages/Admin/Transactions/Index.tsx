import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

import { PageHeader, Pagination } from '@/Components/Admin/Shared';
import {
    TransactionsFiltersBar,
    TransactionsStatsRow,
    TransactionsTable,
    type TransactionsFilters,
    type TransactionsPaginated,
    type TransactionsStats,
} from '@/Components/Admin/Transactions';

interface Props {
    transactions: TransactionsPaginated;
    stats: TransactionsStats;
    filters: TransactionsFilters;
}

export default function TransactionsIndex({ transactions, stats, filters: initialFilters }: Props) {
    const [filters, setFilters] = useState<TransactionsFilters>(initialFilters);
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
                    type: filters.type,
                    status: filters.status,
                    q: filters.q,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['transactions', 'stats', 'filters'],
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
                type: filters.type,
                status: filters.status,
                q: filters.q,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['transactions'],
            },
        );
    };

    // Hand the browser the export URL with the current filter state
    // appended as query params. The backend mirrors `index()`'s filter
    // logic, so the file always matches what's on screen — minus the
    // pagination, which is intentionally ignored on export.
    const exportCsv = () => {
        const params = new URLSearchParams();
        if (filters.type && filters.type !== 'all') {
            params.set('type', filters.type);
        }
        if (filters.status && filters.status !== 'all') {
            params.set('status', filters.status);
        }
        if (filters.q) {
            params.set('q', filters.q);
        }

        const qs = params.toString();
        window.location.href = '/admin/transactions/export' + (qs ? `?${qs}` : '');
    };

    const { data, meta } = transactions;

    return (
        <AdminLayout>
            <Head title="Transactions" />

            <div className="space-y-6">
                <PageHeader
                    title="Transactions"
                    description="Subscription invoices and credit pack purchases."
                    actions={
                        <button
                            type="button"
                            onClick={exportCsv}
                            disabled={data.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    }
                />

                <TransactionsStatsRow stats={stats} />

                <TransactionsFiltersBar value={filters} onChange={setFilters} />

                <TransactionsTable transactions={data} />

                <Pagination meta={meta} onPageChange={goPage} />
            </div>
        </AdminLayout>
    );
}

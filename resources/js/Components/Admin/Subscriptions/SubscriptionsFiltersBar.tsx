import { Search } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type {
    SubscriptionsFilters,
    SubscriptionsPlanOption,
    SubscriptionsStatusFilter,
    SubscriptionsTermFilter,
} from './types';

interface Props {
    value: SubscriptionsFilters;
    plans: SubscriptionsPlanOption[];
    onChange: (next: SubscriptionsFilters) => void;
}

export default function SubscriptionsFiltersBar({ value, plans, onChange }: Props) {
    const t = useT();

    const selectClasses =
        'bg-surface-container-low/50 border border-surface-container rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    const termOptions: { id: SubscriptionsTermFilter; label: string }[] = [
        { id: 'all', label: t('admin.subscriptions.filters.term.all', 'Any term') },
        { id: 'monthly', label: t('admin.subscriptions.filters.term.monthly', 'Monthly') },
        { id: 'yearly', label: t('admin.subscriptions.filters.term.yearly', 'Yearly') },
    ];

    const statusOptions: { id: SubscriptionsStatusFilter; label: string }[] = [
        { id: 'all', label: t('admin.subscriptions.filters.status.all', 'Any status') },
        { id: 'active', label: t('admin.subscriptions.filters.status.active', 'Active') },
        { id: 'trialing', label: t('admin.subscriptions.filters.status.trialing', 'Trialing') },
        {
            id: 'on_grace_period',
            label: t(
                'admin.subscriptions.filters.status.on_grace_period',
                'On grace period',
            ),
        },
        { id: 'past_due', label: t('admin.subscriptions.filters.status.past_due', 'Past due') },
        { id: 'canceled', label: t('admin.subscriptions.filters.status.canceled', 'Canceled') },
        { id: 'expired', label: t('admin.subscriptions.filters.status.expired', 'Expired') },
        {
            id: 'plan_disabled',
            label: t(
                'admin.subscriptions.filters.status.plan_disabled',
                'Plan disabled',
            ),
        },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
                <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                    type="text"
                    value={value.q}
                    onChange={(e) => onChange({ ...value, q: e.target.value })}
                    placeholder={t(
                        'admin.subscriptions.filters.search_placeholder',
                        'Search by name or email',
                    )}
                    className="w-full bg-surface-container-low/50 border border-surface-container rounded-xl pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
            </div>
            <select
                value={value.plan}
                onChange={(e) => onChange({ ...value, plan: e.target.value })}
                className={selectClasses}
            >
                <option value="all">
                    {t('admin.subscriptions.filters.plan.all', 'All plans')}
                </option>
                {plans.map((plan) => (
                    <option key={plan.id} value={String(plan.id)}>
                        {plan.name}
                    </option>
                ))}
            </select>
            <select
                value={value.term}
                onChange={(e) =>
                    onChange({
                        ...value,
                        term: e.target.value as SubscriptionsTermFilter,
                    })
                }
                className={selectClasses}
            >
                {termOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <select
                value={value.status}
                onChange={(e) =>
                    onChange({
                        ...value,
                        status: e.target.value as SubscriptionsStatusFilter,
                    })
                }
                className={selectClasses}
            >
                {statusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

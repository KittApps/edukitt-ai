import { Search } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type {
    PlanOption,
    UsersFilters,
    UsersRoleFilter,
    UsersStatusFilter,
    UsersVerifiedFilter,
} from './types';

interface Props {
    value: UsersFilters;
    plans: PlanOption[];
    onChange: (next: UsersFilters) => void;
}

export default function UsersFiltersBar({ value, plans, onChange }: Props) {
    const t = useT();

    const selectClasses =
        'bg-surface-container-low/50 border border-surface-container rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    const roleOptions: { id: UsersRoleFilter; label: string }[] = [
        { id: 'all', label: t('admin.users.filters.role.all', 'All roles') },
        { id: 'admin', label: t('admin.users.filters.role.admin', 'Admins') },
        { id: 'user', label: t('admin.users.filters.role.user', 'Users') },
    ];

    const verifiedOptions: { id: UsersVerifiedFilter; label: string }[] = [
        { id: 'all', label: t('admin.users.filters.verified.all', 'Any email') },
        { id: 'verified', label: t('admin.users.filters.verified.verified', 'Verified') },
        {
            id: 'unverified',
            label: t('admin.users.filters.verified.unverified', 'Unverified'),
        },
    ];

    const statusOptions: { id: UsersStatusFilter; label: string }[] = [
        { id: 'all', label: t('admin.users.filters.status.all', 'Any status') },
        { id: 'active', label: t('admin.users.filters.status.active', 'Active') },
        { id: 'inactive', label: t('admin.users.filters.status.inactive', 'Inactive') },
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
                        'admin.users.filters.search_placeholder',
                        'Search by name or email',
                    )}
                    className="w-full bg-surface-container-low/50 border border-surface-container rounded-xl pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
            </div>
            <select
                value={value.role}
                onChange={(e) =>
                    onChange({ ...value, role: e.target.value as UsersRoleFilter })
                }
                className={selectClasses}
            >
                {roleOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <select
                value={value.plan}
                onChange={(e) => onChange({ ...value, plan: e.target.value })}
                className={selectClasses}
            >
                <option value="all">{t('admin.users.filters.plan.all', 'All plans')}</option>
                {plans.map((plan) => (
                    <option key={plan.id} value={String(plan.id)}>
                        {plan.name}
                        {plan.is_free
                            ? ` · ${t('admin.users.filters.plan.free_suffix', 'Free')}`
                            : ''}
                    </option>
                ))}
            </select>
            <select
                value={value.verified}
                onChange={(e) =>
                    onChange({
                        ...value,
                        verified: e.target.value as UsersVerifiedFilter,
                    })
                }
                className={selectClasses}
            >
                {verifiedOptions.map((opt) => (
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
                        status: e.target.value as UsersStatusFilter,
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

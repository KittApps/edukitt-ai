import { Search } from 'lucide-react';
import type { TransactionsFilters } from './types';

interface Props {
    value: TransactionsFilters;
    onChange: (next: TransactionsFilters) => void;
}

const TYPE_OPTIONS: { id: TransactionsFilters['type']; label: string }[] = [
    { id: 'all', label: 'All types' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'credit_pack', label: 'Credit pack' },
];

const STATUS_OPTIONS: { id: TransactionsFilters['status']; label: string }[] = [
    { id: 'all', label: 'All status' },
    { id: 'paid', label: 'Paid' },
    { id: 'open', label: 'Open' },
    { id: 'void', label: 'Void' },
    { id: 'uncollectible', label: 'Uncollectible' },
    { id: 'completed', label: 'Completed' },
    { id: 'failed', label: 'Failed' },
    { id: 'pending', label: 'Pending' },
];

export default function TransactionsFiltersBar({ value, onChange }: Props) {
    const selectClasses =
        'bg-surface-container-low/50 border border-surface-container rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

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
                    placeholder="Search by user, email, or reference"
                    className="w-full bg-surface-container-low/50 border border-surface-container rounded-xl pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
            </div>
            <select
                value={value.type}
                onChange={(e) =>
                    onChange({ ...value, type: e.target.value as TransactionsFilters['type'] })
                }
                className={selectClasses}
            >
                {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <select
                value={value.status}
                onChange={(e) =>
                    onChange({ ...value, status: e.target.value as TransactionsFilters['status'] })
                }
                className={selectClasses}
            >
                {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

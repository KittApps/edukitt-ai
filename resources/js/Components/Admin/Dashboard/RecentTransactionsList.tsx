import { Link } from '@inertiajs/react';
import { Coins, CreditCard, Wallet } from 'lucide-react';

import SectionCard from '@/Components/Admin/AiTokensCost/SectionCard';
import { formatMoney } from '@/Components/Admin/Revenue';

import type { RecentTransactionRow } from './types';

interface Props {
    transactions: RecentTransactionRow[];
}

export default function RecentTransactionsList({ transactions }: Props) {
    return (
        <SectionCard
            title="Recent Transactions"
            subtitle="Latest paid purchases"
            icon={<Wallet size={16} className="text-tertiary" />}
            action={
                <Link
                    href="/admin/transactions"
                    className="text-xs font-bold text-primary hover:underline"
                >
                    View all
                </Link>
            }
        >
            {transactions.length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-6">
                    No transactions yet.
                </p>
            ) : (
                <ul className="-mx-1 divide-y divide-surface-container">
                    {transactions.map((t) => (
                        <li key={t.id} className="px-1 py-2.5">
                            <div className="flex items-center gap-3">
                                <TypeIcon type={t.type} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-on-surface truncate">
                                        {t.description}
                                    </p>
                                    <p className="text-[11px] text-on-surface-variant truncate">
                                        {t.user.name}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-headline font-extrabold text-on-surface tabular-nums">
                                        {formatMoney(t.amount, t.currency)}
                                    </p>
                                    <p className="text-[10px] text-on-surface-variant tabular-nums">
                                        {formatDate(t.created_at)}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}

function TypeIcon({ type }: { type: 'subscription' | 'credit_pack' }) {
    if (type === 'credit_pack') {
        return (
            <span className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0">
                <Coins size={16} />
            </span>
        );
    }
    return (
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <CreditCard size={16} />
        </span>
    );
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

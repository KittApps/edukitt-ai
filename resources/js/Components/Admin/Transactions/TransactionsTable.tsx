import { CreditCard, Sparkles } from 'lucide-react';
import { useCurrency } from '@/lib/settings';
import TransactionStatusPill from './TransactionStatusPill';
import type { Transaction, TransactionType } from './types';

interface Props {
    transactions: Transaction[];
}

const TYPE_ICONS: Record<TransactionType, { icon: typeof CreditCard; tone: string; label: string }> = {
    subscription: { icon: CreditCard, tone: 'text-primary bg-primary/10', label: 'Subscription' },
    credit_pack: { icon: Sparkles, tone: 'text-tertiary bg-tertiary/10', label: 'Credit pack' },
};

export default function TransactionsTable({ transactions }: Props) {
    const currency = useCurrency();

    if (transactions.length === 0) {
        return (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center text-sm text-on-surface-variant">
                No transactions match your filters.
            </div>
        );
    }

    const fmtAmount = (v: number) =>
        currency.format(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-surface-container bg-surface-container-low/40">
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Reference</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {transactions.map((tx) => {
                            const t = TYPE_ICONS[tx.type];
                            const Icon = t.icon;
                            const isNegative = tx.amount < 0;
                            return (
                                <tr key={tx.id} className="hover:bg-surface-container-low transition-colors">
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-surface-container-low border border-surface-container flex items-center justify-center text-xs font-semibold text-on-surface flex-shrink-0">
                                                {tx.user.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-on-surface truncate">
                                                    {tx.user.name}
                                                </p>
                                                <p className="text-[11px] text-on-surface-variant truncate">
                                                    {tx.user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${t.tone}`}
                                        >
                                            <Icon size={11} />
                                            {t.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-on-surface">
                                        {tx.description}
                                    </td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">
                                        <span
                                            className={`text-sm font-headline font-bold ${
                                                isNegative ? 'text-amber-600' : 'text-on-surface'
                                            }`}
                                        >
                                            {fmtAmount(tx.amount)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <TransactionStatusPill status={tx.status} />
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-on-surface-variant whitespace-nowrap">
                                        {fmtDate(tx.created_at)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <code className="text-[11px] font-mono text-on-surface-variant">
                                            {tx.reference}
                                        </code>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

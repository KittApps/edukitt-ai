import { TrendingUp, CreditCard, ReceiptText, Sparkles } from 'lucide-react';
import { useCurrency } from '@/lib/settings';
import type { TransactionsStats } from './types';

interface Props {
    stats: TransactionsStats;
}

export default function TransactionsStatsRow({ stats }: Props) {
    const currency = useCurrency();
    const fmtMoney = (v: number) => currency.format(v, { maximumFractionDigits: 0 });
    const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

    const cards = [
        {
            label: 'Gross revenue',
            value: fmtMoney(stats.gross_revenue),
            hint: 'this period',
            icon: <TrendingUp size={16} className="text-emerald-600" />,
        },
        {
            label: 'Subscriptions',
            value: fmtMoney(stats.subscriptions_revenue),
            hint: 'recurring billing',
            icon: <CreditCard size={16} className="text-primary" />,
        },
        {
            label: 'Paid invoices',
            value: fmtNum(stats.paid_invoices),
            hint: 'successful charges',
            icon: <ReceiptText size={16} className="text-tertiary" />,
        },
        {
            label: 'Credit packs',
            value: fmtMoney(stats.credit_packs_revenue),
            hint: 'one-off purchases',
            icon: <Sparkles size={16} className="text-tertiary" />,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center">
                            {c.icon}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {c.label}
                        </p>
                    </div>
                    <p className="mt-2 text-xl font-headline font-extrabold text-on-surface truncate">
                        {c.value}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">{c.hint}</p>
                </div>
            ))}
        </div>
    );
}

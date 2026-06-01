import {
    CheckCircle2,
    AlertCircle,
    Clock,
    FileText,
    Ban,
    Slash,
} from 'lucide-react';
import type { TransactionStatus } from './types';

const STYLES: Record<
    TransactionStatus,
    { wrap: string; icon: typeof CheckCircle2; label: string }
> = {
    paid: { wrap: 'text-emerald-600 bg-emerald-500/10', icon: CheckCircle2, label: 'Paid' },
    open: { wrap: 'text-blue-600 bg-blue-500/10', icon: FileText, label: 'Open' },
    void: { wrap: 'text-on-surface-variant bg-surface-container-low', icon: Ban, label: 'Void' },
    uncollectible: { wrap: 'text-red-600 bg-red-500/10', icon: Slash, label: 'Uncollectible' },
    completed: { wrap: 'text-emerald-600 bg-emerald-500/10', icon: CheckCircle2, label: 'Completed' },
    failed: { wrap: 'text-red-600 bg-red-500/10', icon: AlertCircle, label: 'Failed' },
    pending: { wrap: 'text-on-surface-variant bg-surface-container-low', icon: Clock, label: 'Pending' },
};

export default function TransactionStatusPill({ status }: { status: TransactionStatus }) {
    const s = STYLES[status];
    const Icon = s.icon;
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${s.wrap}`}
        >
            <Icon size={11} />
            {s.label}
        </span>
    );
}

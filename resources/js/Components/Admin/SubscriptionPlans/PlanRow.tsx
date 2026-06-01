import { Link } from '@inertiajs/react';
import { Pencil, Trash2, Sparkles, Star } from 'lucide-react';
import { useCurrency } from '@/lib/settings';
import type { Plan } from './types';


interface Props {
    plan: Plan;
    onDelete: () => void;
    onMakeDefault?: () => void;
}

export default function PlanRow({ plan, onDelete, onMakeDefault }: Props) {
    const currency = useCurrency();
    const fmtMoney = (v: number) =>
        currency.format(v, { maximumFractionDigits: 0, zeroAs: 'Free' });

    return (
        <tr className="hover:bg-surface-container-low transition-colors">
            <td className="px-4 py-4">
                <div className="flex items-start gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-on-surface">{plan.name}</p>
                            {plan.is_popular && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    <Sparkles size={10} /> Popular
                                </span>
                            )}
                            {plan.is_default && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                                    <Star size={10} /> Default
                                </span>
                            )}
                            {!plan.is_active && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded">
                                    Inactive
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-on-surface-variant truncate mt-0.5">
                            {plan.tagline}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-right tabular-nums">
                <p className="text-sm font-headline font-bold text-on-surface">
                    {fmtMoney(plan.monthly_price)}
                </p>
                <p className="text-[11px] text-on-surface-variant">/ month</p>
            </td>
            <td className="px-4 py-4 text-right tabular-nums">
                <p className="text-sm font-headline font-bold text-on-surface">
                    {fmtMoney(plan.yearly_price)}
                </p>
                <p className="text-[11px] text-on-surface-variant">/ year</p>
            </td>
            <td className="px-4 py-4 text-right tabular-nums">
                <p className="text-sm font-bold text-on-surface">
                    {plan.default_credits.toLocaleString()}
                </p>
                <p className="text-[11px] text-on-surface-variant">/ month</p>
            </td>
            <td className="px-4 py-4 text-right tabular-nums">
                <p className="text-sm font-bold text-on-surface">
                    {plan.subscriber_count.toLocaleString()}
                </p>
                <p className="text-[11px] text-on-surface-variant">subscribers</p>
            </td>
            <td className="px-4 py-4">
                {plan.stripe.linked ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Linked
                    </span>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
                        —
                    </span>
                )}
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-1">
                    {onMakeDefault && !plan.is_default && (
                        <button
                            onClick={onMakeDefault}
                            title="Make default"
                            className="p-2 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-colors"
                        >
                            <Star size={14} />
                        </button>
                    )}
                    <Link
                        href={`/admin/subscription-plans/${plan.id}/edit`}
                        title="Edit"
                        className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                    >
                        <Pencil size={14} />
                    </Link>
                    <button
                        onClick={onDelete}
                        title="Delete"
                        disabled={plan.is_default}
                        className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

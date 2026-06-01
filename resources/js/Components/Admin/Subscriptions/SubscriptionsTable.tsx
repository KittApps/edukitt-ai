import { Link } from '@inertiajs/react';
import { Pencil, Zap } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCurrency } from '@/lib/settings';
import { SUBSCRIPTION_STATUS_STYLES } from '@/Components/Admin/Users/subscriptionStatus';
import type { SubscriptionRow } from './types';

interface Props {
    subscriptions: SubscriptionRow[];
}

export default function SubscriptionsTable({ subscriptions }: Props) {
    const t = useT();
    const currency = useCurrency();

    if (subscriptions.length === 0) {
        return (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center text-sm text-on-surface-variant">
                {t(
                    'admin.subscriptions.table.empty',
                    'No subscriptions match your filters.',
                )}
            </div>
        );
    }

    const fmtDate = (iso: string | null) => {
        if (iso === null) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const fmtMoney = (v: number) => currency.format(v, { maximumFractionDigits: 0 });

    const initials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (
            parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    };

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-surface-container bg-surface-container-low/40">
                            <th className="px-4 py-3">
                                {t('admin.subscriptions.table.col.user', 'User')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.subscriptions.table.col.plan', 'Plan')}
                            </th>
                            <th className="px-4 py-3 text-right">
                                {t('admin.subscriptions.table.col.price', 'Price')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.subscriptions.table.col.term', 'Term')}
                            </th>
                            <th className="px-4 py-3">
                                {t(
                                    'admin.subscriptions.table.col.started',
                                    'Started',
                                )}
                            </th>
                            <th className="px-4 py-3">
                                {t(
                                    'admin.subscriptions.table.col.renews',
                                    'Renews / Ends',
                                )}
                            </th>
                            <th className="px-4 py-3">
                                {t(
                                    'admin.subscriptions.table.col.last_payment',
                                    'Last payment',
                                )}
                            </th>
                            <th className="px-4 py-3">
                                {t(
                                    'admin.subscriptions.table.col.status',
                                    'Status',
                                )}
                            </th>
                            <th className="px-4 py-3 text-right">
                                {t(
                                    'admin.subscriptions.table.col.actions',
                                    'Actions',
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {subscriptions.map((row) => {
                            const styles =
                                SUBSCRIPTION_STATUS_STYLES[row.status];
                            return (
                                <tr
                                    key={row.id}
                                    className="hover:bg-surface-container-low transition-colors"
                                >
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            {row.user.avatar !== null &&
                                            row.user.avatar !== '' ? (
                                                <img
                                                    src={row.user.avatar}
                                                    alt=""
                                                    className="w-8 h-8 rounded-lg object-cover border border-surface-container flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-surface-container-low border border-surface-container flex items-center justify-center text-xs font-semibold text-on-surface flex-shrink-0">
                                                    {initials(row.user.name)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-on-surface truncate">
                                                    {row.user.name}
                                                </p>
                                                <p className="text-[11px] text-on-surface-variant truncate">
                                                    {row.user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                {row.plan.name}
                                            </span>
                                            {!row.is_stripe_managed && (
                                                <span
                                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700"
                                                    title={t(
                                                        'admin.subscriptions.table.manual_grant',
                                                        'Admin grant \u2014 not billed via Stripe',
                                                    )}
                                                >
                                                    <Zap size={9} />
                                                    {t(
                                                        'admin.subscriptions.table.manual',
                                                        'Manual',
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">
                                        <span className="text-sm font-bold text-on-surface">
                                            {fmtMoney(row.plan.unit_price)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {row.plan.cycle === 'yearly' ? (
                                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                                                {t(
                                                    'admin.subscriptions.table.term.yearly',
                                                    'Yearly',
                                                )}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
                                                {t(
                                                    'admin.subscriptions.table.term.monthly',
                                                    'Monthly',
                                                )}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-on-surface-variant whitespace-nowrap">
                                        {fmtDate(row.started_at)}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-on-surface-variant whitespace-nowrap">
                                        {fmtDate(row.ends_at)}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-on-surface-variant whitespace-nowrap">
                                        {fmtDate(row.last_payment_at)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span
                                            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${styles.classes}`}
                                        >
                                            {t(styles.labelKey, styles.fallback)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link
                                                href={`/admin/users/${row.user.id}/edit?section=subscription`}
                                                title={t(
                                                    'admin.subscriptions.table.actions.edit',
                                                    'Manage subscription',
                                                )}
                                                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </Link>
                                        </div>
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

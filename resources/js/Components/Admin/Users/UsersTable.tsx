import { Link } from '@inertiajs/react';
import {
    ShieldCheck,
    MailX,
    MailCheck,
    Coins,
    Pencil,
    Trash2,
    Ban,
    CheckCircle2,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { SUBSCRIPTION_STATUS_STYLES } from './subscriptionStatus';
import type { UserRow } from './types';

interface Props {
    users: UserRow[];
    onDelete: (user: UserRow) => void;
}

export default function UsersTable({ users, onDelete }: Props) {
    const t = useT();

    if (users.length === 0) {
        return (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center text-sm text-on-surface-variant">
                {t('admin.users.table.empty', 'No users match your filters.')}
            </div>
        );
    }

    const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

    const fmtDate = (iso: string | null) => {
        if (iso === null) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const initials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-surface-container bg-surface-container-low/40">
                            <th className="px-4 py-3">
                                {t('admin.users.table.col.user', 'User')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.users.table.col.role', 'Role')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.users.table.col.plan', 'Plan')}
                            </th>
                            <th className="px-4 py-3 text-right">
                                {t('admin.users.table.col.credits', 'Credits')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.users.table.col.email', 'Email')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.users.table.col.status', 'Status')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.users.table.col.joined', 'Joined')}
                            </th>
                            <th className="px-4 py-3">
                                {t('admin.users.table.col.last_login', 'Last login')}
                            </th>
                            <th className="px-4 py-3 text-right">
                                {t('admin.users.table.col.actions', 'Actions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {users.map((user) => (
                            <tr
                                key={user.id}
                                className="hover:bg-surface-container-low transition-colors"
                            >
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        {user.avatar !== null && user.avatar !== '' ? (
                                            <img
                                                src={user.avatar}
                                                alt=""
                                                className="w-8 h-8 rounded-lg object-cover border border-surface-container flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-surface-container-low border border-surface-container flex items-center justify-center text-xs font-semibold text-on-surface flex-shrink-0">
                                                {initials(user.name)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-on-surface truncate">
                                                {user.name}
                                            </p>
                                            <p className="text-[11px] text-on-surface-variant truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5">
                                    {user.is_admin ? (
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-1 rounded-md">
                                            <ShieldCheck size={11} />
                                            {t('admin.users.role.admin', 'Admin')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">
                                            {t('admin.users.role.user', 'User')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="flex flex-col items-start gap-1">
                                        {user.plan === null ? (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
                                                —
                                            </span>
                                        ) : user.plan.is_free ? (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
                                                {user.plan.name}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                {user.plan.name}
                                            </span>
                                        )}
                                        {user.subscription_status !== 'no_plan' && (
                                            <p className="text-[11px] text-on-surface-variant truncate">
                                                {t(
                                                    SUBSCRIPTION_STATUS_STYLES[
                                                        user.subscription_status
                                                    ].labelKey,
                                                    SUBSCRIPTION_STATUS_STYLES[
                                                        user.subscription_status
                                                    ].fallback,
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-right tabular-nums">
                                    {user.credits === null ? (
                                        <span className="text-xs text-on-surface-variant">—</span>
                                    ) : (
                                        <p className="text-sm font-bold text-on-surface inline-flex items-center gap-1">
                                            <Coins size={12} className="text-primary" />
                                            {fmtNum(user.credits.used)}
                                            <span className="text-on-surface-variant/70 font-normal">
                                                {' / '}
                                                {fmtNum(user.credits.total)}
                                            </span>
                                        </p>
                                    )}
                                </td>
                                <td className="px-4 py-3.5">
                                    {user.email_verified_at !== null ? (
                                        <span
                                            className="inline-flex items-center justify-center text-emerald-600 bg-emerald-500/10 w-7 h-7 rounded-md"
                                            title={t(
                                                'admin.users.status.verified',
                                                'Email verified',
                                            )}
                                            aria-label={t(
                                                'admin.users.status.verified',
                                                'Email verified',
                                            )}
                                        >
                                            <MailCheck size={13} />
                                        </span>
                                    ) : (
                                        <span
                                            className="inline-flex items-center justify-center text-amber-700 bg-amber-500/10 w-7 h-7 rounded-md"
                                            title={t(
                                                'admin.users.status.unverified',
                                                'Email not verified',
                                            )}
                                            aria-label={t(
                                                'admin.users.status.unverified',
                                                'Email not verified',
                                            )}
                                        >
                                            <MailX size={13} />
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3.5">
                                    {user.is_active ? (
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md">
                                            <CheckCircle2 size={11} />
                                            {t('admin.users.status.active', 'Active')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-500/10 px-2 py-1 rounded-md">
                                            <Ban size={11} />
                                            {t('admin.users.status.inactive', 'Inactive')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3.5 text-xs text-on-surface-variant whitespace-nowrap">
                                    {fmtDate(user.created_at)}
                                </td>
                                <td className="px-4 py-3.5 text-xs text-on-surface-variant whitespace-nowrap">
                                    {user.last_login_at === null
                                        ? t('admin.users.table.last_login.never', 'Never')
                                        : fmtDate(user.last_login_at)}
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link
                                            href={`/admin/users/${user.id}/edit`}
                                            title={t('admin.users.table.actions.edit', 'Edit')}
                                            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(user)}
                                            title={t('admin.users.table.actions.delete', 'Delete')}
                                            className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

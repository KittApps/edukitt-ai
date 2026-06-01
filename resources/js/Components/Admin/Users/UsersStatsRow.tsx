import { Users, ShieldCheck, MailCheck, Crown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { UsersStats } from './types';

interface Props {
    stats: UsersStats;
}

export default function UsersStatsRow({ stats }: Props) {
    const t = useT();
    const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

    const cards = [
        {
            label: t('admin.users.stats.total', 'Total users'),
            value: fmtNum(stats.total),
            hint: t('admin.users.stats.total_hint', 'all-time registrations'),
            icon: <Users size={16} className="text-primary" />,
        },
        {
            label: t('admin.users.stats.admins', 'Admins'),
            value: fmtNum(stats.admins),
            hint: t('admin.users.stats.admins_hint', 'with admin role'),
            icon: <ShieldCheck size={16} className="text-secondary" />,
        },
        {
            label: t('admin.users.stats.verified', 'Verified'),
            value: fmtNum(stats.verified),
            hint: t('admin.users.stats.verified_hint', 'confirmed their email'),
            icon: <MailCheck size={16} className="text-emerald-600" />,
        },
        {
            label: t('admin.users.stats.paid', 'Paid'),
            value: fmtNum(stats.paid),
            hint: t('admin.users.stats.paid_hint', 'on a paid plan'),
            icon: <Crown size={16} className="text-tertiary" />,
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

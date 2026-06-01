import { CheckCircle, FileEdit, FileText, Lock } from 'lucide-react';

import { useT } from '@/lib/i18n';

import type { PagesStats } from './types';

interface Props {
    stats: PagesStats;
}

export default function PagesStatsRow({ stats }: Props) {
    const t = useT();
    const fmt = (v: number) => new Intl.NumberFormat('en-US').format(v);

    const cards = [
        {
            label: t('admin.pages.stats.total', 'Pages'),
            value: fmt(stats.total),
            hint: t('admin.pages.stats.total_hint', 'all pages'),
            icon: <FileText size={16} className="text-primary" />,
        },
        {
            label: t('admin.pages.stats.published', 'Published'),
            value: fmt(stats.published),
            hint: t('admin.pages.stats.published_hint', 'visible to visitors'),
            icon: <CheckCircle size={16} className="text-emerald-600" />,
        },
        {
            label: t('admin.pages.stats.drafts', 'Drafts'),
            value: fmt(stats.drafts),
            hint: t('admin.pages.stats.drafts_hint', 'not yet live'),
            icon: <FileEdit size={16} className="text-secondary" />,
        },
        {
            label: t('admin.pages.stats.system', 'System'),
            value: fmt(stats.system),
            hint: t('admin.pages.stats.system_hint', 'locked slug, no delete'),
            icon: <Lock size={16} className="text-tertiary" />,
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
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                        {c.hint}
                    </p>
                </div>
            ))}
        </div>
    );
}

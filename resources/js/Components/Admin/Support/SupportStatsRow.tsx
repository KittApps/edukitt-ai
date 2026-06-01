import {
    CheckCircle,
    FolderTree,
    HelpCircle,
    MessageSquare,
} from 'lucide-react';

import { useT } from '@/lib/i18n';

import type { SupportStats } from './types';

interface Props {
    stats: SupportStats;
}

export default function SupportStatsRow({ stats }: Props) {
    const t = useT();
    const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

    const cards = [
        {
            label: t('admin.support.stats.categories', 'Categories'),
            value: fmtNum(stats.categories),
            hint: t('admin.support.stats.categories_hint', 'total groups'),
            icon: <FolderTree size={16} className="text-primary" />,
        },
        {
            label: t('admin.support.stats.active_categories', 'Active categories'),
            value: fmtNum(stats.categories_active),
            hint: t('admin.support.stats.active_categories_hint', 'visible to users'),
            icon: <CheckCircle size={16} className="text-emerald-600" />,
        },
        {
            label: t('admin.support.stats.faqs', 'FAQs'),
            value: fmtNum(stats.faqs),
            hint: t('admin.support.stats.faqs_hint', 'total questions'),
            icon: <MessageSquare size={16} className="text-secondary" />,
        },
        {
            label: t('admin.support.stats.active_faqs', 'Active FAQs'),
            value: fmtNum(stats.faqs_active),
            hint: t('admin.support.stats.active_faqs_hint', 'visible to users'),
            icon: <HelpCircle size={16} className="text-tertiary" />,
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

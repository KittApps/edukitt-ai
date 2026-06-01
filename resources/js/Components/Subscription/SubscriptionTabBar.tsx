import { motion } from 'framer-motion';
import { CreditCard, Coins, Activity, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { useT } from '@/lib/i18n';
import type { SubscriptionTab } from './types';

interface Props {
    active: SubscriptionTab;
    onChange: (tab: SubscriptionTab) => void;
    showCredits?: boolean;
}

interface TabDef {
    id: SubscriptionTab;
    label: string;
    icon: ComponentType<LucideProps>;
}

export default function SubscriptionTabBar({ active, onChange, showCredits = true }: Props) {
    const t = useT();

    const allTabs: TabDef[] = [
        { id: 'plans', label: t('subscription.tab.plans', 'Plans'), icon: CreditCard },
        { id: 'credits', label: t('subscription.tab.credits', 'Credits'), icon: Coins },
        { id: 'usage', label: t('subscription.tab.usage', 'Usage'), icon: Activity },
    ];

    const tabs = showCredits ? allTabs : allTabs.filter((tab) => tab.id !== 'credits');

    return (
        <div className="flex items-center gap-1.5 bg-surface-container-low rounded-2xl p-1.5 border border-surface-container">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                            isActive
                                ? 'text-on-surface'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="subscription-tab-bg"
                                className="absolute inset-0 bg-surface-container-lowest rounded-xl shadow-sm"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative flex items-center gap-2">
                            <Icon size={16} />
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

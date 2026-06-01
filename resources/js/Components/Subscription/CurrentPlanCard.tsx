import { motion } from 'framer-motion';
import {
    Crown,
    Sparkles,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { CreditBalance, CurrentPlan, SubscriptionStatus } from './types';

interface Props {
    current: CurrentPlan;
    balance: CreditBalance;
    showCredits?: boolean;
}

interface StatusMeta {
    label: string;
    tone: string;
    icon: typeof CheckCircle2;
}

function useStatusMeta(): Record<SubscriptionStatus, StatusMeta> {
    const t = useT();

    return {
        active: {
            label: t('subscription.status.active', 'Active'),
            tone: 'text-emerald-700 bg-emerald-500/10',
            icon: CheckCircle2,
        },
        trialing: {
            label: t('subscription.status.trialing', 'Trial'),
            tone: 'text-primary bg-primary/10',
            icon: Clock,
        },
        past_due: {
            label: t('subscription.status.past_due', 'Past due'),
            tone: 'text-amber-700 bg-amber-500/10',
            icon: AlertCircle,
        },
        canceled: {
            label: t('subscription.status.canceled', 'Canceled'),
            tone: 'text-on-surface-variant bg-surface-container',
            icon: XCircle,
        },
        inactive: {
            label: t('subscription.status.inactive', 'Inactive'),
            tone: 'text-on-surface-variant bg-surface-container',
            icon: XCircle,
        },
        free: {
            label: t('subscription.status.free', 'Free'),
            tone: 'text-on-surface-variant bg-surface-container',
            icon: Crown,
        },
    };
}

export default function CurrentPlanCard({ current, balance, showCredits = true }: Props) {
    const t = useT();
    const statusMeta = useStatusMeta();
    const meta = statusMeta[current.status] ?? statusMeta.inactive;
    const StatusIcon = meta.icon;

    const pct =
        balance.total > 0
            ? Math.min(100, Math.round((balance.used / balance.total) * 100))
            : 0;

    const resetDate = balance.resets_at
        ? new Date(balance.resets_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '—';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container p-8"
        >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center flex-shrink-0">
                        <Crown size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-lg font-headline font-extrabold text-on-surface">
                                {current.name}
                            </h3>
                            <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${meta.tone}`}
                            >
                                <StatusIcon size={11} />
                                {meta.label}
                            </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                            {current.tagline}
                        </p>
                    </div>
                </div>
                {showCredits && (
                    <div className="flex items-center gap-2 bg-primary/8 px-4 py-2 rounded-xl">
                        <Sparkles size={14} className="text-primary" />
                        <span className="text-sm font-bold text-primary tabular-nums">
                            {t(
                                'subscription.current.credits_remaining',
                                '{used} / {total} credits',
                                { used: balance.used, total: balance.total },
                            )}
                        </span>
                    </div>
                )}
            </div>

            {showCredits && (
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        <span>
                            {t('subscription.current.credits_used', 'Credits used')}
                        </span>
                        <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                                pct > 80 ? 'bg-tertiary' : 'bg-primary'
                            }`}
                        />
                    </div>
                    <p className="text-[11px] text-on-surface-variant pt-1">
                        {t('subscription.current.resets_at', 'Resets on {date}', {
                            date: resetDate,
                        })}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

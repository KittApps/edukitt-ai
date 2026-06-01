import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Loader2, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCurrency } from '@/lib/settings';
import type { SubscriptionPlan } from './types';

interface Props {
    /** Plan the user just clicked on, or `null` to keep the modal closed. */
    targetPlan: SubscriptionPlan | null;
    /** The plan record the user is currently on (looked up from `plans`). */
    currentPlan: SubscriptionPlan | null;
    /** Display label of the user's current plan. */
    currentPlanName: string;
    submitting: boolean;
    /** Inline error from the swap controller (e.g. card declined). */
    error?: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Confirmation dialog shown when a paid subscriber clicks a different
 * plan card. Upgrades surface the prorated-charge warning; downgrades
 * surface the no-refund warning with a red-tinted primary button.
 */
export default function ConfirmPlanChangeModal({
    targetPlan,
    currentPlan,
    currentPlanName,
    submitting,
    error,
    onCancel,
    onConfirm,
}: Props) {
    const t = useT();
    const currency = useCurrency();

    if (!targetPlan) return null;

    const currentMonthly = currentPlan?.monthly_price ?? 0;
    const isDowngrade = targetPlan.monthly_price < currentMonthly;

    const fmtMoney = (v: number) =>
        currency.format(v, {
            maximumFractionDigits: 0,
            zeroAs: t('subscription.plan.free', 'Free'),
        });

    const fromPrice = fmtMoney(currentMonthly);
    const toPrice = fmtMoney(targetPlan.monthly_price);

    const title = isDowngrade
        ? t('subscription.plan.confirm.downgrade_title', 'Confirm downgrade')
        : t('subscription.plan.confirm.upgrade_title', 'Confirm upgrade');

    const body = isDowngrade
        ? t(
              'subscription.plan.confirm.downgrade_body',
              "You're moving from {from} ({from_price}/mo) to {to} ({to_price}/mo). The change takes effect now and any unused credits on your current plan will not be refunded.",
              {
                  from: currentPlanName,
                  from_price: fromPrice,
                  to: targetPlan.name,
                  to_price: toPrice,
              },
          )
        : t(
              'subscription.plan.confirm.upgrade_body',
              "You're switching from {from} ({from_price}/mo) to {to} ({to_price}/mo). You'll be charged the prorated difference today and the new plan starts immediately.",
              {
                  from: currentPlanName,
                  from_price: fromPrice,
                  to: targetPlan.name,
                  to_price: toPrice,
              },
          );

    const actionLabel = isDowngrade
        ? t('subscription.plan.confirm.downgrade_action', 'Downgrade now')
        : t('subscription.plan.confirm.upgrade_action', 'Upgrade now');

    const Icon = isDowngrade ? ArrowDownRight : ArrowUpRight;

    return (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={submitting ? undefined : onCancel}
            >
                <motion.div
                    key="dialog"
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="bg-surface-container-lowest rounded-3xl border border-surface-container max-w-md w-full p-7 shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-50"
                        aria-label={t('common.close', 'Close')}
                    >
                        <X size={16} className="mx-auto" />
                    </button>

                    <div
                        className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${
                            isDowngrade
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-primary/10 text-primary'
                        }`}
                    >
                        <Icon size={22} />
                    </div>

                    <h2 className="text-xl font-headline font-extrabold text-on-surface mb-1.5">
                        {title}
                    </h2>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                        {body}
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
                        >
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={submitting}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container disabled:opacity-50"
                        >
                            {t('subscription.plan.confirm.cancel', 'Cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={submitting}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60 ${
                                isDowngrade
                                    ? 'bg-red-600 hover:brightness-110'
                                    : 'bg-primary hover:brightness-110'
                            }`}
                        >
                            {submitting && (
                                <Loader2 size={14} className="animate-spin" />
                            )}
                            {actionLabel}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

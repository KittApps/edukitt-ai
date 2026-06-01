import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Coins, Crown, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { PageProps as AppPageProps } from '@/types';

export interface LimitReachedPayload {
    ok: false;
    reason:
        | 'out_of_credits'
        | 'feature_limit'
        | 'expired_plan'
        | 'paid_plan_required';
    message: string;
    cta: {
        type: 'buy_credits' | 'upgrade_plan';
        href: string;
    };
    feature?: string;
    task?: string;
    required?: number;
    available?: number;
}

type FlashProps = {
    flash?: {
        limit_reached?: LimitReachedPayload;
    };
};

/**
 * Global flash listener that turns a `limit_reached` payload from the
 * server into a modal. Mounted once at the App layout level so every
 * create flow gets the same UX automatically when the backend throws
 * OutOfCreditsException / FeatureLimitReachedException.
 *
 * Axios callers can also push a payload manually by dispatching the
 * `billing:limit-reached` window event with the payload as detail.
 */
export default function LimitReachedModal() {
    const t = useT();
    const { props } = usePage<AppPageProps<FlashProps>>();
    const [payload, setPayload] = useState<LimitReachedPayload | null>(null);

    useEffect(() => {
        const flash = (props.flash as FlashProps['flash'])?.limit_reached;
        if (flash) setPayload(flash);
    }, [props.flash]);

    useEffect(() => {
        const onEvent = (e: Event) => {
            const detail = (e as CustomEvent<LimitReachedPayload>).detail;
            if (detail) setPayload(detail);
        };
        window.addEventListener('billing:limit-reached', onEvent as EventListener);
        return () =>
            window.removeEventListener('billing:limit-reached', onEvent as EventListener);
    }, []);

    if (!payload) return null;

    const isCredits = payload.reason === 'out_of_credits';
    const isExpired = payload.reason === 'expired_plan';
    const isPaidOnly = payload.reason === 'paid_plan_required';

    const Icon = isCredits ? Coins : isExpired ? AlertTriangle : Crown;

    const titleKey = isCredits
        ? 'billing.limit.out_of_credits.title'
        : isExpired
          ? 'billing.limit.expired.title'
          : isPaidOnly
            ? 'billing.limit.paid_only.title'
            : 'billing.limit.feature.title';

    const titleFallback = isCredits
        ? "You're out of credits"
        : isExpired
          ? 'Your plan has expired'
          : isPaidOnly
            ? 'Paid plan required'
            : 'Plan limit reached';

    const ctaKey = payload.cta.type === 'buy_credits'
        ? 'billing.limit.cta.buy_credits'
        : 'billing.limit.cta.upgrade';

    const ctaFallback = payload.cta.type === 'buy_credits'
        ? 'Buy more credits'
        : isExpired
          ? 'Renew plan'
          : 'Upgrade plan';

    const handleGo = () => {
        const href = payload.cta.href;
        setPayload(null);
        router.visit(href);
    };

    return (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
                onClick={() => setPayload(null)}
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
                        onClick={() => setPayload(null)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant"
                        aria-label={t('common.close', 'Close')}
                    >
                        <X size={16} className="mx-auto" />
                    </button>

                    <div
                        className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${
                            isCredits
                                ? 'bg-tertiary/10 text-tertiary'
                                : isExpired
                                  ? 'bg-amber-500/10 text-amber-700'
                                  : 'bg-primary/10 text-primary'
                        }`}
                    >
                        <Icon size={22} />
                    </div>

                    <h2 className="text-xl font-headline font-extrabold text-on-surface mb-1.5">
                        {t(titleKey, titleFallback)}
                    </h2>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                        {payload.message}
                    </p>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPayload(null)}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container"
                        >
                            {t('billing.limit.dismiss', 'Not now')}
                        </button>
                        <button
                            type="button"
                            onClick={handleGo}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110"
                        >
                            {t(ctaKey, ctaFallback)}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

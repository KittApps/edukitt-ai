import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useT } from '@/lib/i18n';

interface Props {
    open: boolean;
    lessonTitle: string;
    /**
     * Optional close handler. When provided, the X button appears
     * only after {@link revealCloseAfterMs} elapses so the user has
     * an escape hatch for unusually slow generations without being
     * able to abort the typical fast path.
     */
    onClose?: () => void;
    /**
     * Delay before the close button appears (ms). Defaults to 30s —
     * past the upper bound of a normal generation.
     */
    revealCloseAfterMs?: number;
}

const TIP_KEYS: { key: string; fallback: string }[] = [
    { key: 'lessons.generating.tip_outline', fallback: 'Outlining the key ideas…' },
    { key: 'lessons.generating.tip_examples', fallback: 'Picking clear examples…' },
    { key: 'lessons.generating.tip_writing', fallback: 'Drafting the explanations…' },
    { key: 'lessons.generating.tip_polish', fallback: 'Polishing the prose…' },
    { key: 'lessons.generating.tip_almost', fallback: 'Almost there…' },
];

export default function LessonGenerationOverlay({
    open,
    lessonTitle,
    onClose,
    revealCloseAfterMs = 30000,
}: Props) {
    const t = useT();
    const [tipIndex, setTipIndex] = useState(0);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (!open) {
            setTipIndex(0);
            setCanClose(false);
            return;
        }
        const tipId = window.setInterval(() => {
            setTipIndex((i) => (i + 1) % TIP_KEYS.length);
        }, 2600);
        const closeId = window.setTimeout(() => {
            setCanClose(true);
        }, revealCloseAfterMs);
        return () => {
            window.clearInterval(tipId);
            window.clearTimeout(closeId);
        };
    }, [open, revealCloseAfterMs]);

    const showCloseButton = canClose && typeof onClose === 'function';

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-live="polite"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-container shadow-xl overflow-hidden"
                    >
                        <AnimatePresence>
                            {showCloseButton && (
                                <motion.button
                                    type="button"
                                    onClick={onClose}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.18 }}
                                    aria-label={t('common.close', 'Close')}
                                    title={t(
                                        'lessons.generating.close_hint',
                                        "Taking longer than usual — you can close this and we'll keep generating in the background.",
                                    )}
                                    className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                                >
                                    <X size={14} />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <div className="px-7 pt-8 pb-7 space-y-5">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-on-surface-variant">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                                    </span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest">
                                        {t('lessons.generating.kicker', 'Loading lesson')}
                                    </p>
                                </div>
                                <h2
                                    title={lessonTitle}
                                    className="text-lg font-headline font-extrabold text-on-surface leading-tight truncate"
                                >
                                    {lessonTitle}
                                </h2>
                            </div>

                            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                                <motion.div
                                    aria-hidden
                                    className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-secondary to-tertiary"
                                    animate={{ x: ['-110%', '320%'] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                />
                            </div>

                            <div className="h-5 relative overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={tipIndex}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-sm text-on-surface-variant"
                                    >
                                        {t(TIP_KEYS[tipIndex].key, TIP_KEYS[tipIndex].fallback)}
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            <p className="text-[11px] text-on-surface-variant/70">
                                {t(
                                    'lessons.generating.hint',
                                    'This usually takes 10-30 seconds. Stay on this page.',
                                )}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useGdpr } from '@/lib/settings';

const STORAGE_KEY = 'gdpr-cookie-consent';

type Choice = 'accepted' | 'declined';

function readChoice(): Choice | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = window.localStorage.getItem(STORAGE_KEY);
        return v === 'accepted' || v === 'declined' ? v : null;
    } catch {
        return null;
    }
}

function storeChoice(choice: Choice) {
    try {
        window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
        // ignore: best-effort, banner just reappears next visit
    }
}

/**
 * Cookie-consent banner mounted by PublicLayout. Renders nothing
 * when the admin has disabled GDPR or the visitor has already made
 * a choice — short-circuits before any animation work.
 */
export default function CookieBanner() {
    const gdpr = useGdpr();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!gdpr.enabled) {
            setVisible(false);
            return;
        }
        setVisible(readChoice() === null);
    }, [gdpr.enabled]);

    const decide = (choice: Choice) => {
        storeChoice(choice);
        setVisible(false);
    };

    if (!gdpr.enabled) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    role="dialog"
                    aria-live="polite"
                    aria-label="Cookie consent"
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                    className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5 sm:pb-5"
                >
                    <div className="mx-auto max-w-4xl rounded-2xl border border-surface-container bg-surface-container-lowest/95 backdrop-blur shadow-xl">
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="flex-shrink-0 mt-0.5 p-2 rounded-xl bg-primary/10 text-primary">
                                    <Cookie size={18} />
                                </div>
                                <p className="text-sm text-on-surface leading-relaxed min-w-0">
                                    {gdpr.banner_message}
                                    {gdpr.policy_url && (
                                        <>
                                            {' '}
                                            <a
                                                href={gdpr.policy_url}
                                                className="font-bold text-primary hover:underline underline-offset-4"
                                            >
                                                {gdpr.policy_label}
                                            </a>
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 sm:flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => decide('declined')}
                                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                                >
                                    {gdpr.decline_label}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => decide('accepted')}
                                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 transition-all"
                                >
                                    {gdpr.accept_label}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

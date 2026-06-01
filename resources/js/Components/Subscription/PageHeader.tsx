import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

interface Props {
    action?: ReactNode;
}

export default function PageHeader({ action }: Props) {
    const t = useT();
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                <Crown size={16} />
                {t('subscription.kicker', 'Subscription')}
            </p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                    {t('subscription.title', 'Choose your plan')}
                </h1>
                {action}
            </div>
            <p className="text-on-surface-variant mt-2 max-w-xl">
                {t(
                    'subscription.subtitle',
                    'Scale your learning with AI-generated courses, quizzes, and quick learns. Pick a plan that fits your pace.',
                )}
            </p>
        </motion.div>
    );
}

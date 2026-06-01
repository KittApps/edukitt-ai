import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface QuickLearnCardProps {
    icon: ReactNode;
    title: string;
    duration: string;
    colorClass: string;
}

export default function QuickLearnCard({ icon, title, duration, colorClass }: QuickLearnCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex-shrink-0 w-48 bg-surface-container-low rounded-2xl p-5 hover:bg-surface-container-lowest transition-all cursor-pointer border border-transparent hover:border-surface-container hover:shadow-md"
        >
            <div className={`mb-3.5 ${colorClass}`}>{icon}</div>
            <h4 className="font-headline font-bold text-sm text-on-surface leading-snug">{title}</h4>
            <p className="text-[11px] font-semibold text-on-surface-variant mt-2 uppercase tracking-wider">{duration}</p>
        </motion.div>
    );
}

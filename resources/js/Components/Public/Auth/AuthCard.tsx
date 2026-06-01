import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer?: ReactNode;
    eyebrow?: string;
    centered?: boolean;
    wide?: boolean;
}

export default function AuthCard({
    title,
    subtitle,
    children,
    footer,
    eyebrow,
    centered = false,
    wide = false,
}: AuthCardProps) {
    const align = centered ? 'text-center' : '';
    const maxWidth = wide ? 'max-w-2xl' : 'max-w-md';

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={`w-full ${maxWidth} mx-auto`}
        >
            <div className="bg-surface-container-lowest rounded-3xl border border-surface-container shadow-xl shadow-primary/5 p-7 sm:p-9">
                {eyebrow && (
                    <p
                        className={`text-[11px] font-black text-primary uppercase tracking-[0.18em] mb-3 ${align}`}
                    >
                        {eyebrow}
                    </p>
                )}
                <h1
                    className={`font-headline font-extrabold tracking-tight text-on-surface text-2xl sm:text-3xl leading-tight ${align}`}
                >
                    {title}
                </h1>
                {subtitle && (
                    <p
                        className={`mt-2 text-sm sm:text-[15px] text-on-surface-variant leading-relaxed font-medium ${align}`}
                    >
                        {subtitle}
                    </p>
                )}

                <div className="mt-7">{children}</div>
            </div>

            {footer && (
                <div className="mt-6 text-center">{footer}</div>
            )}
        </motion.div>
    );
}

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeMap: Record<NonNullable<Props['size']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
};

export default function Modal({
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
}: Props) {
    return (
        <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className={`bg-surface rounded-2xl border border-surface-container w-full ${sizeMap[size]} p-6 space-y-4`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h3 className="font-headline font-extrabold text-lg text-on-surface">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-xs text-on-surface-variant mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-low flex-shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div>{children}</div>
                {footer && (
                    <div className="flex items-center justify-end gap-2 pt-2">{footer}</div>
                )}
            </motion.div>
        </div>
    );
}

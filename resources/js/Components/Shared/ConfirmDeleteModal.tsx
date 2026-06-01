import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

import { useT } from '@/lib/i18n';

interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    isProcessing?: boolean;
}

export default function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    cancelLabel,
    isProcessing = false,
}: Props) {
    const t = useT();

    useEffect(() => {
        if (!open) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isProcessing) onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, isProcessing, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => {
                        if (!isProcessing) onClose();
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="w-full max-w-md bg-surface rounded-3xl border border-surface-container overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 flex-shrink-0 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-headline font-extrabold text-on-surface leading-tight">
                                        {title ?? t('common.confirm_delete.title', 'Are you sure?')}
                                    </h2>
                                    <div className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                                        {description ?? t(
                                            'common.confirm_delete.description',
                                            'This action cannot be undone.',
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-surface-container-low/40 border-t border-surface-container flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isProcessing}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-50"
                            >
                                {cancelLabel ?? t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-error hover:brightness-110 transition-all disabled:opacity-60"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        {t('common.deleting', 'Deleting…')}
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        {confirmLabel ?? t('common.delete', 'Delete')}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

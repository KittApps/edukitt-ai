import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onRegenerate: (text: string) => Promise<void>;
}

export default function RegenerateModal({ isOpen, onClose, onRegenerate }: Props) {
    const t = useT();
    const [text, setText] = useState('');

    const quickTags = [
        t('courses.regenerate.tag.examples', 'More practical examples'),
        t('courses.regenerate.tag.fewer_modules', 'Fewer modules'),
        t('courses.regenerate.tag.add_assessments', 'Add assessments'),
        t('courses.regenerate.tag.simplify', 'Simplify topics'),
        t('courses.regenerate.tag.more_depth', 'More depth'),
    ];

    const appendTag = (tag: string) => {
        setText((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-surface-container"
                    >
                        <div className="p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <RefreshCw size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-headline font-extrabold text-lg text-on-surface">
                                            {t('courses.regenerate.title', 'Regenerate Outline')}
                                        </h3>
                                        <p className="text-xs text-on-surface-variant">
                                            {t(
                                                'courses.regenerate.subtitle',
                                                'Tell the AI what to change',
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-on-surface-variant hover:text-on-surface p-2 rounded-xl hover:bg-surface-container transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                                    {t('courses.regenerate.what_should_change', 'What should change?')}
                                </label>
                                <textarea
                                    rows={4}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline-variant resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                                    placeholder={t(
                                        'courses.regenerate.placeholder',
                                        'e.g. Add more hands-on projects, reduce theory in Module 2, split Module 3 into two separate modules...',
                                    )}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2.5 block">
                                    {t('courses.regenerate.quick_adjustments', 'Quick adjustments')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {quickTags.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => appendTag(tag)}
                                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-low text-on-surface-variant hover:bg-primary/10 hover:text-primary border border-surface-container transition-all"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container border border-surface-container transition-all"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onRegenerate(text)}
                                    disabled={!text.trim()}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/15 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Sparkles size={16} />
                                    {t('courses.outline.regenerate', 'Regenerate')}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

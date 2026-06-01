import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import RegenerateModal from '@/Components/CreateCourse/RegenerateModal';
import { useT } from '@/lib/i18n';

interface Module {
    module: string;
    short_desc: string;
    lessons: { title: string; summary: string }[];
}

interface Props {
    outline: Module[];
    onRegenerate: (text: string) => Promise<void>;
    onAccept: () => Promise<void>;
    isGenerating: boolean;
}

export default function OutlineReview({ outline, onRegenerate, onAccept, isGenerating }: Props) {
    const t = useT();
    const [expanded, setExpanded] = useState<number | null>(0);
    const [showRegenerate, setShowRegenerate] = useState(false);

    const totalLessons = outline.reduce((sum, m) => sum + m.lessons.length, 0);

    return (
        <div className="space-y-5">
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-headline font-extrabold text-lg text-on-surface">
                            {t('courses.outline.title', 'Course Outline')}
                        </h3>
                        <p className="text-sm text-on-surface-variant mt-1">
                            {t('courses.outline.summary', '{modules} modules · {lessons} lessons', {
                                modules: outline.length,
                                lessons: totalLessons,
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
                        <Sparkles size={14} />
                        <span className="text-xs font-bold">
                            {t('courses.outline.ai_generated', 'AI Generated')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {outline.map((mod, i) => {
                    const isOpen = expanded === i;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden"
                        >
                            <button
                                onClick={() => setExpanded(isOpen ? null : i)}
                                className="w-full flex items-center gap-4 p-5 text-left group"
                            >
                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-black">{i + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-headline font-bold text-on-surface text-[15px] leading-snug">
                                        {mod.module}
                                    </h4>
                                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                                        {mod.short_desc}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden sm:block">
                                        {t('courses.outline.lesson_count', '{count} lessons', {
                                            count: mod.lessons.length,
                                        })}
                                    </span>
                                    <ChevronDown
                                        size={18}
                                        className={`text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-5">
                                            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed pl-13">
                                                {mod.short_desc}
                                            </p>
                                            <div className="space-y-1">
                                                {mod.lessons.map((lesson, li) => (
                                                    <div
                                                        key={li}
                                                        className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-surface-container-low transition-colors ml-9"
                                                    >
                                                        <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[10px] font-bold text-on-surface-variant">
                                                                {i + 1}.{li + 1}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-on-surface font-medium">
                                                            {lesson.title}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={() => setShowRegenerate(true)}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container border border-surface-container transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} />
                    {t('courses.outline.regenerate', 'Regenerate')}
                </button>
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onAccept}
                    disabled={isGenerating}
                    className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-sm rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('common.creating', 'Creating...')}
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={18} />
                            {t('courses.outline.accept', 'Accept & Create Course')}
                        </>
                    )}
                </motion.button>
            </div>

            <RegenerateModal
                isOpen={showRegenerate}
                onClose={() => setShowRegenerate(false)}
                onRegenerate={async (text) => {
                    setShowRegenerate(false);
                    await onRegenerate(text);
                }}
            />
        </div>
    );
}

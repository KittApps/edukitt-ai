import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

import ConfigSection from '@/Components/CreateQuiz/ConfigSection';
import { useT } from '@/lib/i18n';
import { submitAiGeneration } from '@/lib/aiGeneration';

interface PersonalizeOptionDto {
    key: string;
    value: string;
    is_default?: boolean;
}

interface PersonalizeGroupDto {
    key: string;
    label: string;
    description: string | null;
    options: PersonalizeOptionDto[];
}

interface Props {
    moduleId: number;
    isRegenerate: boolean;
    personalizeGroups: PersonalizeGroupDto[];
    personalizeDefaults: Record<string, string>;
    onClose: () => void;
}

const DEFAULT_TIME_LIMIT = '10 min';

/**
 * Modal that captures personalize selections for a module-end quiz and
 * POSTs to /app/modules/{module}/quiz. On success, redirects straight
 * to the existing quiz Show page so the user can take it immediately.
 *
 * Reuses {@link ConfigSection} verbatim — same chips, same UX as the
 * manual quiz wizard, no duplicated form code.
 */
export default function ModuleQuizModal({
    moduleId,
    isRegenerate,
    personalizeGroups,
    personalizeDefaults,
    onClose,
}: Props) {
    const t = useT();
    const [personalization, setPersonalization] = useState<Record<string, string>>(
        () => ({ ...personalizeDefaults }),
    );
    const [timeLimit, setTimeLimit] = useState<string>(DEFAULT_TIME_LIMIT);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Queue-aware submit. With queue mode on the modal's
            // "Generating..." button keeps spinning while the worker
            // builds the quiz; either way we land on the same Show
            // page once done.
            const data = await submitAiGeneration<{ redirect?: string }>(
                `/app/modules/${moduleId}/quiz`,
                {
                    preferences: personalization,
                    time_limit: timeLimit,
                },
            );
            if (data.redirect) {
                window.location.href = data.redirect;
                return;
            }
            onClose();
        } catch (error) {
            console.error('Failed to generate module quiz:', error);
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-2xl bg-surface rounded-3xl border border-surface-container overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-surface-container">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1 flex items-center gap-1.5">
                                <Sparkles size={11} />
                                {t('courses.show.module.quiz.modal.kicker', 'Module Quiz')}
                            </p>
                            <h2 className="text-xl font-headline font-extrabold text-on-surface">
                                {isRegenerate
                                    ? t(
                                          'courses.show.module.quiz.modal.title_regenerate',
                                          'Regenerate Module Quiz',
                                      )
                                    : t(
                                          'courses.show.module.quiz.modal.title',
                                          'Generate Module Quiz',
                                      )}
                            </h2>
                            <p className="text-sm text-on-surface-variant mt-1">
                                {t(
                                    'courses.show.module.quiz.modal.description',
                                    'The AI will write questions covering every lesson in this module.',
                                )}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all flex-shrink-0"
                            aria-label={t('common.close', 'Close')}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                        <ConfigSection
                            personalization={personalization}
                            setPersonalization={setPersonalization}
                            groups={personalizeGroups}
                            timeLimit={timeLimit}
                            setTimeLimit={setTimeLimit}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-container bg-surface-container-lowest">
                        <button
                            onClick={onClose}
                            disabled={isGenerating}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-50"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-secondary-container text-white text-sm font-bold shadow-lg shadow-secondary/20 disabled:opacity-60"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('common.generating', 'Generating...')}
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    {isRegenerate
                                        ? t(
                                              'courses.show.module.quiz.modal.regenerate',
                                              'Regenerate Quiz',
                                          )
                                        : t(
                                              'courses.show.module.quiz.modal.generate',
                                              'Generate Quiz',
                                          )}
                                </>
                            )}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

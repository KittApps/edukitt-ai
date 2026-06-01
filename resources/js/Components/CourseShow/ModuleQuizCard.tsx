import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { ClipboardList, Sparkles, Play, Trophy, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/i18n';

import ModuleQuizModal from './ModuleQuizModal';
import type { ModuleQuiz } from '@/Pages/App/Courses/Show';

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
    quiz: ModuleQuiz | null;
    personalizeGroups: PersonalizeGroupDto[];
    personalizeDefaults: Record<string, string>;
}

/**
 * Renders the module-end quiz affordance at the bottom of every module
 * accordion. Two states:
 *   - quiz exists  → "Take Module Quiz" CTA + best-score chip + regenerate
 *   - quiz missing → "Generate Module Quiz" CTA opening the personalize modal
 *
 * The actual generation (POST + redirect) lives in {@link ModuleQuizModal}
 * so this card stays presentational.
 */
export default function ModuleQuizCard({
    moduleId,
    quiz,
    personalizeGroups,
    personalizeDefaults,
}: Props) {
    const t = useT();
    const [open, setOpen] = useState(false);

    return (
        <>
            <div className="rounded-2xl bg-gradient-to-br from-secondary/8 to-secondary/4 border border-secondary/15 p-5">
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={12} className="text-secondary" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
                                {t('courses.show.module.quiz.kicker', 'Module Quiz')}
                            </span>
                        </div>

                        {quiz ? (
                            <>
                                <h4 className="font-headline font-bold text-on-surface leading-snug">
                                    {quiz.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-on-surface-variant">
                                    <span className="font-semibold">
                                        {t(
                                            'courses.show.module.quiz.questions',
                                            '{count} questions',
                                            { count: quiz.question_count },
                                        )}
                                    </span>
                                    {quiz.difficulty && (
                                        <>
                                            <span className="text-outline-variant">·</span>
                                            <span>{quiz.difficulty}</span>
                                        </>
                                    )}
                                    {quiz.best_score !== null && (
                                        <>
                                            <span className="text-outline-variant">·</span>
                                            <span className="inline-flex items-center gap-1 font-bold text-secondary">
                                                <Trophy size={11} />
                                                {t(
                                                    'courses.show.module.quiz.best',
                                                    'Best {score}%',
                                                    { score: quiz.best_score },
                                                )}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 className="font-headline font-bold text-on-surface leading-snug">
                                    {t(
                                        'courses.show.module.quiz.empty.title',
                                        'Test what you learned',
                                    )}
                                </h4>
                                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                                    {t(
                                        'courses.show.module.quiz.empty.description',
                                        'Generate a short AI quiz covering this module’s lessons.',
                                    )}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                        {quiz ? (
                            <>
                                <Link
                                    href={`/app/quizzes/${quiz.id}`}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold hover:brightness-110 transition-all"
                                >
                                    <Play size={13} fill="currentColor" />
                                    {t('courses.show.module.quiz.take', 'Take Quiz')}
                                </Link>
                                <button
                                    onClick={() => setOpen(true)}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-on-surface-variant hover:text-secondary hover:bg-secondary/8 transition-all"
                                >
                                    <RefreshCw size={11} />
                                    {t('courses.show.module.quiz.regenerate', 'Regenerate')}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold hover:brightness-110 transition-all"
                            >
                                <Sparkles size={13} />
                                {t('courses.show.module.quiz.generate', 'Generate Quiz')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {open && (
                <ModuleQuizModal
                    moduleId={moduleId}
                    isRegenerate={quiz !== null}
                    personalizeGroups={personalizeGroups}
                    personalizeDefaults={personalizeDefaults}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}

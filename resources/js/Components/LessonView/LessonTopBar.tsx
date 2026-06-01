import { Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    RefreshCw,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { NavigableLesson } from '@/lib/lessonNavigation';

interface Props {
    courseId: number;
    lessonId: number;
    moduleTitle: string;
    lessonTitle: string;
    lessonDuration?: string | null;
    lessonIndex: number;
    totalLessons: number;
    completedTopics: number;
    totalTopics: number;
    prevLesson: NavigableLesson | null;
    nextLesson: NavigableLesson | null;
    onLessonNavigate: (lesson: NavigableLesson) => void;
    isCompleted: boolean;
    onRegenerate: () => void;
    isRegenerating: boolean;
}

export default function LessonTopBar({
    courseId,
    lessonId,
    moduleTitle,
    lessonTitle,
    lessonDuration,
    lessonIndex,
    totalLessons,
    completedTopics,
    totalTopics,
    prevLesson,
    nextLesson,
    onLessonNavigate,
    isCompleted,
    onRegenerate,
    isRegenerating,
}: Props) {
    const t = useT();
    const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    const handleToggleComplete = () => {
        router.post(
            `/app/lessons/${lessonId}/complete`,
            {},
            {
                preserveScroll: true,
                preserveState: false,
            },
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container px-6 py-4"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        href={`/app/courses/${courseId}`}
                        className="p-2 rounded-xl hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-all flex-shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </Link>

                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
                            {moduleTitle}
                        </p>
                        <h2 className="text-base font-headline font-extrabold text-on-surface truncate">
                            {lessonTitle}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    {lessonDuration && (
                        <>
                            <div className="hidden md:flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                                <span className="flex items-center gap-1">
                                    <Clock size={13} />
                                    {lessonDuration}
                                </span>
                            </div>
                            <div className="h-5 w-px bg-surface-container hidden md:block" />
                        </>
                    )}

                    <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden hidden sm:block">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                className="h-full bg-primary rounded-full"
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant whitespace-nowrap">
                            {completedTopics}/{totalTopics}
                        </span>
                    </div>

                    <div className="h-5 w-px bg-surface-container" />

                    <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={isRegenerating}
                        title={t('lessons.top_bar.regenerate', 'Regenerate lesson')}
                        aria-label={t('lessons.top_bar.regenerate', 'Regenerate lesson')}
                        className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw
                            size={16}
                            className={isRegenerating ? 'animate-spin' : ''}
                        />
                    </button>

                    <div className="h-5 w-px bg-surface-container" />

                    <div className="flex items-center gap-1">
                        {prevLesson ? (
                            <button
                                type="button"
                                onClick={() => onLessonNavigate(prevLesson)}
                                className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        ) : (
                            <span className="p-2 rounded-lg text-on-surface-variant opacity-30">
                                <ChevronLeft size={16} />
                            </span>
                        )}
                        <span className="text-[10px] font-bold text-on-surface-variant min-w-[36px] text-center">
                            {lessonIndex + 1} / {totalLessons}
                        </span>
                        {nextLesson ? (
                            <button
                                type="button"
                                onClick={() => onLessonNavigate(nextLesson)}
                                className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <span className="p-2 rounded-lg text-on-surface-variant opacity-30">
                                <ChevronRight size={16} />
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleToggleComplete}
                        className={`hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-[0.97] ${
                            isCompleted
                                ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
                                : 'bg-primary text-white hover:brightness-110'
                        }`}
                    >
                        <CheckCircle2 size={14} />
                        {isCompleted
                            ? t('lessons.top_bar.completed', 'Completed')
                            : t('lessons.top_bar.mark_complete', 'Mark Complete')}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ConfirmDeleteModal from '@/Components/Shared/ConfirmDeleteModal';
import {
    ArrowLeft,
    Clock,
    Layers,
    BookOpen,
    Globe,
    Calendar,
    Cpu,
    Play,
    CheckCircle2,
    Circle,
    ChevronDown,
    Settings2,
    Trash2,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import ModuleQuizCard from '@/Components/CourseShow/ModuleQuizCard';
import CourseCertificateCard, {
    type CourseCertificateInfo,
} from '@/Components/CourseShow/CourseCertificateCard';
import LessonGenerationOverlay from '@/Components/Shared/LessonGenerationOverlay';
import { useLessonNavigation } from '@/lib/lessonNavigation';

interface Lesson {
    id: number;
    title: string;
    is_generated: boolean;
    completed_at: string | null;
    sort_order: number;
    estimated_duration: string | null;
}

export interface ModuleQuiz {
    id: number;
    title: string;
    question_count: number;
    difficulty: string | null;
    best_score: number | null;
}

interface Module {
    id: number;
    title: string;
    description: string | null;
    sort_order: number;
    lessons: Lesson[];
    quiz: ModuleQuiz | null;
}

interface Course {
    id: number;
    title: string;
    description: string | null;
    language: string;
    ai_model_name: string | null;
    preferences: Record<string, string> | null;
    difficulty: string | null;
    status: string;
    progress: number;
    created_at: string;
    certificate: CourseCertificateInfo;
    modules: Module[];
}

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
    course: Course;
    quizPersonalizeGroups: PersonalizeGroupDto[];
    quizPersonalizeDefaults: Record<string, string>;
    showAiModel: boolean;
}

function humanizePreferenceKey(key: string): string {
    return key
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCreatedAt(createdAt: string) {
    try {
        return new Date(createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return createdAt;
    }
}

export default function Show({
    course,
    quizPersonalizeGroups,
    quizPersonalizeDefaults,
    showAiModel,
}: Props) {
    const t = useT();
    const { generating, openLesson, cancel } = useLessonNavigation();
    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedLessons = course.modules.reduce(
        (sum, m) => sum + m.lessons.filter((l) => l.completed_at !== null).length,
        0,
    );
    const progressPercent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const parseMinutes = (raw: string | null | undefined): number => {
        if (!raw) return 0;
        const match = raw.match(/(\d+)\s*(h|hour|hr|m|min|minute)?/i);
        if (!match) return 0;
        const n = parseInt(match[1], 10);
        const unit = (match[2] ?? 'min').toLowerCase();
        return unit.startsWith('h') ? n * 60 : n;
    };
    const totalMinutes = course.modules.reduce(
        (sum, m) => sum + m.lessons.reduce((s, l) => s + parseMinutes(l.estimated_duration), 0),
        0,
    );
    const fallbackMinutes = totalLessons * 10;
    const effectiveMinutes = totalMinutes > 0 ? totalMinutes : fallbackMinutes;
    const durationLabel =
        effectiveMinutes >= 60
            ? `${Math.floor(effectiveMinutes / 60)}h ${effectiveMinutes % 60}m`
            : `${effectiveMinutes} min`;

    const findNextLesson = (): Lesson | null => {
        for (const mod of course.modules) {
            for (const lesson of mod.lessons) {
                if (!lesson.completed_at) return lesson;
            }
        }
        return course.modules[0]?.lessons[0] ?? null;
    };
    const nextLesson = findNextLesson();
    const nextLessonId = nextLesson?.id ?? null;

    return (
        <AppLayout>
            <Head title={course.title} />
            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                >
                    <Link
                        href="/app/library"
                        className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors group"
                    >
                        <ArrowLeft
                            size={16}
                            className="group-hover:-translate-x-1 transition-transform"
                        />
                        {t('courses.show.back_to_library', 'Back to Library')}
                    </Link>

                    <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-8">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-2.5">
                                    {course.difficulty && (
                                        <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                                            {course.difficulty}
                                        </span>
                                    )}
                                    <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">
                                        {t('courses.show.badge_course', 'Course')}
                                    </span>
                                </div>

                                <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                                    {course.title}
                                </h1>

                                {course.description && (
                                    <p className="text-on-surface-variant leading-relaxed max-w-2xl">
                                        {course.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant font-medium pt-1">
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={14} className="text-primary" />
                                        {durationLabel}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Layers size={14} className="text-primary" />
                                        {t('courses.show.modules_count', '{count} modules', {
                                            count: course.modules.length,
                                        })}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <BookOpen size={14} className="text-primary" />
                                        {t('courses.show.lessons_count', '{count} lessons', {
                                            count: totalLessons,
                                        })}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Globe size={14} className="text-primary" />
                                        {course.language}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-primary" />
                                        {formatCreatedAt(course.created_at)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-4 min-w-[180px]">
                                <div className="relative w-28 h-28">
                                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r="52"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            className="text-surface-container"
                                        />
                                        <motion.circle
                                            cx="60"
                                            cy="60"
                                            r="52"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            className="text-primary"
                                            strokeDasharray={2 * Math.PI * 52}
                                            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                                            animate={{
                                                strokeDashoffset:
                                                    2 * Math.PI * 52 * (1 - progressPercent / 100),
                                            }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-headline font-black text-on-surface">
                                            {progressPercent}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-on-surface-variant font-medium">
                                    {t(
                                        'courses.show.lessons_done',
                                        '{completed} / {total} lessons done',
                                        { completed: completedLessons, total: totalLessons },
                                    )}
                                </p>
                                {nextLesson && (
                                    <button
                                        type="button"
                                        onClick={() => openLesson(nextLesson)}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110 transition-all active:scale-[0.97]"
                                    >
                                        <Play size={16} fill="currentColor" />
                                        {t('courses.show.continue_learning', 'Continue Learning')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8 space-y-3">
                        <h2 className="text-xl font-headline font-extrabold text-on-surface">
                            {t('courses.show.modules_heading', 'Course Modules')}
                        </h2>
                        <div className="space-y-2.5">
                            {course.modules.map((mod, i) => (
                                <ModuleAccordion
                                    key={mod.id}
                                    module={mod}
                                    index={i}
                                    nextLessonId={nextLessonId}
                                    personalizeGroups={quizPersonalizeGroups}
                                    personalizeDefaults={quizPersonalizeDefaults}
                                    onLessonSelect={openLesson}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="xl:col-span-4">
                        <div className="sticky top-28 space-y-5">
                            <CourseCertificateCard
                                courseId={course.id}
                                certificate={course.certificate}
                            />
                            <GenerationDetailsCard
                                language={course.language}
                                preferences={course.preferences}
                                aiModelName={course.ai_model_name}
                                showAiModel={showAiModel}
                            />
                            <ActionsCard courseId={course.id} />
                        </div>
                    </div>
                </div>
            </div>

            <LessonGenerationOverlay
                open={generating !== null}
                lessonTitle={generating?.title ?? ''}
                onClose={cancel}
            />
        </AppLayout>
    );
}

function ModuleAccordion({
    module: mod,
    index,
    nextLessonId,
    personalizeGroups,
    personalizeDefaults,
    onLessonSelect,
}: {
    module: Module;
    index: number;
    nextLessonId: number | null;
    personalizeGroups: PersonalizeGroupDto[];
    personalizeDefaults: Record<string, string>;
    onLessonSelect: (lesson: { id: number; title: string; is_generated: boolean }) => void;
}) {
    const t = useT();
    const completedCount = mod.lessons.filter((l) => l.completed_at !== null).length;
    const allDone = completedCount === mod.lessons.length && mod.lessons.length > 0;
    const [isOpen, setIsOpen] = useState(index === 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-4 p-5 text-left group"
            >
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${
                        allDone
                            ? 'bg-primary text-white'
                            : completedCount > 0
                              ? 'bg-primary/10 text-primary'
                              : 'bg-surface-container text-on-surface-variant'
                    }`}
                >
                    {allDone ? <CheckCircle2 size={18} /> : <span>{index + 1}</span>}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-headline font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">
                        {mod.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                        {t(
                            'courses.show.module.lesson_progress',
                            '{completed} / {total} lessons',
                            { completed: completedCount, total: mod.lessons.length },
                        )}
                    </p>
                </div>

                {!allDone && completedCount > 0 && (
                    <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden hidden sm:block">
                        <div
                            className="h-full bg-primary rounded-full"
                            style={{
                                width: `${(completedCount / mod.lessons.length) * 100}%`,
                            }}
                        />
                    </div>
                )}

                <ChevronDown
                    size={18}
                    className={`text-on-surface-variant transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
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
                        <div className="px-5 pb-5 space-y-1">
                            {mod.description && (
                                <p className="text-sm text-on-surface-variant leading-relaxed mb-3 pl-14">
                                    {mod.description}
                                </p>
                            )}
                            {mod.lessons.map((lesson) => {
                                const isCompleted = lesson.completed_at !== null;
                                const isNext = lesson.id === nextLessonId && !isCompleted;
                                return (
                                    <Link
                                        key={lesson.id}
                                        href={`/app/lessons/${lesson.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onLessonSelect(lesson);
                                        }}
                                        className={`w-full flex items-center gap-3.5 py-3 px-4 rounded-xl transition-all text-left group/lesson ${
                                            isNext
                                                ? 'bg-primary/10 border border-primary/15'
                                                : 'hover:bg-surface-container-low'
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2
                                                size={18}
                                                className="text-primary flex-shrink-0"
                                            />
                                        ) : isNext ? (
                                            <Play
                                                size={18}
                                                className="text-primary flex-shrink-0"
                                                fill="currentColor"
                                            />
                                        ) : (
                                            <Circle
                                                size={18}
                                                className="text-outline-variant flex-shrink-0"
                                            />
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <span
                                                className={`text-sm font-medium leading-snug ${
                                                    isCompleted
                                                        ? 'text-on-surface-variant'
                                                        : isNext
                                                          ? 'text-primary font-bold'
                                                          : 'text-on-surface'
                                                }`}
                                            >
                                                {lesson.title}
                                            </span>
                                        </div>

                                        {lesson.estimated_duration && (
                                            <span className="text-[11px] text-on-surface-variant font-medium flex-shrink-0 flex items-center gap-1">
                                                <Clock size={11} />
                                                {lesson.estimated_duration}
                                            </span>
                                        )}

                                        {isNext && (
                                            <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
                                                {t('courses.show.up_next', 'Up Next')}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}

                            <div className="pt-3">
                                <ModuleQuizCard
                                    moduleId={mod.id}
                                    quiz={mod.quiz}
                                    personalizeGroups={personalizeGroups}
                                    personalizeDefaults={personalizeDefaults}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function GenerationDetailsCard({
    language,
    preferences,
    aiModelName,
    showAiModel,
}: {
    language: string;
    preferences: Record<string, string> | null;
    aiModelName: string | null;
    showAiModel: boolean;
}) {
    const t = useT();
    const entries = Object.entries(preferences ?? {}).filter(
        ([, value]) => typeof value === 'string' && value.trim().length > 0,
    );

    const hasContent = language || entries.length > 0 || (showAiModel && aiModelName);
    if (!hasContent) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container p-6 space-y-4"
        >
            <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-primary" />
                <h3 className="text-sm font-bold text-on-surface">
                    {t('courses.show.generation.title', 'Generation Details')}
                </h3>
            </div>

            <div className="space-y-3 text-sm">
                {language && (
                    <DetailRow
                        icon={<Globe size={13} />}
                        label={t('courses.show.generation.language', 'Language')}
                        value={language}
                    />
                )}
                {showAiModel && aiModelName && (
                    <DetailRow
                        icon={<Cpu size={13} />}
                        label={t('courses.show.generation.model', 'AI Model')}
                        value={aiModelName}
                    />
                )}
                {entries.length > 0 && (
                    <div className="rounded-xl bg-surface-container-low/60 px-3 py-3 space-y-2">
                        {entries.map(([key, value]) => (
                            <div
                                key={key}
                                className="flex items-center justify-between gap-3"
                            >
                                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                    {humanizePreferenceKey(key)}
                                </span>
                                <span className="text-xs font-semibold text-on-surface capitalize text-right truncate">
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <span className="text-primary">{icon}</span>
                {label}
            </span>
            <span className="text-xs font-semibold text-on-surface text-right truncate">
                {value}
            </span>
        </div>
    );
}

function ActionsCard({ courseId }: { courseId: number }) {
    const t = useT();
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        setDeleting(true);
        router.delete(`/app/courses/${courseId}`, {
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container p-6 space-y-2"
        >
            <h3 className="text-sm font-bold text-on-surface mb-3">
                {t('courses.show.actions.title', 'Actions')}
            </h3>
            <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-red-500 transition-all"
            >
                <Trash2 size={16} />
                {t('courses.show.actions.delete', 'Delete Course')}
            </button>

            <ConfirmDeleteModal
                open={confirmingDelete}
                onClose={() => setConfirmingDelete(false)}
                onConfirm={handleDelete}
                isProcessing={deleting}
            />
        </motion.div>
    );
}

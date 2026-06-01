import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Cpu,
    Eye,
    Globe,
    HelpCircle,
    Lightbulb,
    ListChecks,
    Play,
    RefreshCcw,
    Settings2,
    Sparkles,
    Timer,
    Trash2,
    Trophy,
    X,
    XCircle,
} from 'lucide-react';
import ConfirmDeleteModal from '@/Components/Shared/ConfirmDeleteModal';
import { useT } from '@/lib/i18n';

interface Question {
    question: string;
    type: 'multiple-choice' | 'true-false' | 'short-answer';
    options: string[];
    correct_answer: string;
    explanation: string;
}

interface QuizData {
    id: number;
    title: string;
    description: string | null;
    topic: string | null;
    question_count: number;
    preferences: Record<string, string> | null;
    language: string | null;
    ai_model_name: string | null;
    questions: Question[];
    created_at: string | null;
}

interface AttemptSummary {
    id: number;
    score: number;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    completed_at: string | null;
}

interface AttemptResult {
    id: number;
    score: number;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    answers: Array<{
        question_index: number;
        user_answer: string;
        is_correct: boolean;
    }>;
}

interface Props {
    quiz: QuizData;
    attempts: AttemptSummary[];
    bestScore: number | null;
    showAiModel: boolean;
}

type Mode = 'idle' | 'playing' | 'reviewing' | 'completed';

function humanizePreferenceKey(key: string): string {
    return key
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseTimeLimitSeconds(raw: string | null): number | null {
    if (!raw) return null;
    const normalized = raw.toLowerCase();
    if (normalized.includes('no') || normalized.includes('unlimited')) return null;
    const match = normalized.match(/(\d+)/);
    if (!match) return null;
    const minutes = parseInt(match[1], 10);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;
    return minutes * 60;
}

function formatDuration(seconds: number): string {
    if (seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    if (s === 0) return `${m}m`;
    return `${m}m ${s}s`;
}

export default function Show({ quiz, attempts, bestScore, showAiModel }: Props) {
    const t = useT();
    const [mode, setMode] = useState<Mode>('idle');
    const [answers, setAnswers] = useState<string[]>(() =>
        Array(quiz.questions.length).fill(''),
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<AttemptResult | null>(null);
    const [attemptList, setAttemptList] = useState<AttemptSummary[]>(attempts);
    const [best, setBest] = useState<number | null>(bestScore);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const startedAtRef = useRef<number | null>(null);

    const timeLimitRaw = quiz.preferences?.time_limit ?? null;
    const totalSeconds = useMemo(
        () => parseTimeLimitSeconds(timeLimitRaw),
        [timeLimitRaw],
    );
    const remainingSeconds = totalSeconds !== null ? Math.max(0, totalSeconds - elapsed) : null;
    const timeUp = totalSeconds !== null && elapsed >= totalSeconds;

    useEffect(() => {
        if (mode !== 'playing') return;
        const id = window.setInterval(() => {
            if (startedAtRef.current === null) return;
            setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 1000);
        return () => window.clearInterval(id);
    }, [mode]);

    const start = () => {
        setAnswers(Array(quiz.questions.length).fill(''));
        setCurrentIndex(0);
        setElapsed(0);
        setResult(null);
        startedAtRef.current = Date.now();
        setMode('playing');
    };

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const response = await axios.post(`/app/quizzes/${quiz.id}/attempts`, {
                answers,
                time_spent_seconds: elapsed,
            });
            const attempt = response.data.attempt as AttemptResult;
            setResult(attempt);
            setAttemptList((prev) => [
                {
                    id: attempt.id,
                    score: attempt.score,
                    correct_count: attempt.correct_count,
                    total_questions: attempt.total_questions,
                    time_spent_seconds: attempt.time_spent_seconds,
                    completed_at: t('common.just_now', 'just now'),
                },
                ...prev,
            ]);
            setBest((prev) => (prev === null ? attempt.score : Math.max(prev, attempt.score)));
            setMode('completed');
        } catch (e) {
            console.error('Failed to submit quiz attempt', e);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (mode === 'playing' && timeUp && !submitting) {
            void submit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeUp, mode]);

    const handleDelete = () => {
        setDeleting(true);
        router.delete(`/app/quizzes/${quiz.id}`, {
            onFinish: () => setDeleting(false),
        });
    };

    const startReview = () => {
        if (!result) return;
        setCurrentIndex(0);
        setMode('reviewing');
    };

    const reviewAttempt = async (attemptId: number) => {
        try {
            const response = await axios.get(
                `/app/quizzes/${quiz.id}/attempts/${attemptId}`,
            );
            setResult(response.data.attempt as AttemptResult);
            setCurrentIndex(0);
            setMode('reviewing');
        } catch (e) {
            console.error('Failed to load attempt', e);
        }
    };

    return (
        <AppLayout>
            <Head title={quiz.title} />

            <AnimatePresence mode="wait">
                {mode === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                    >
                        <IdleView
                            quiz={quiz}
                            attempts={attemptList}
                            bestScore={best}
                            showAiModel={showAiModel}
                            onStart={start}
                            onDelete={() => setConfirmingDelete(true)}
                            onReviewAttempt={reviewAttempt}
                        />
                    </motion.div>
                )}

                {mode === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                    >
                        <QuizRunner
                            mode="play"
                            quiz={quiz}
                            answers={answers}
                            setAnswers={setAnswers}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            remainingSeconds={remainingSeconds}
                            totalSeconds={totalSeconds}
                            elapsed={elapsed}
                            submitting={submitting}
                            onSubmit={submit}
                            onExit={() => setMode('idle')}
                        />
                    </motion.div>
                )}

                {mode === 'reviewing' && result && (
                    <motion.div
                        key="reviewing"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                    >
                        <QuizRunner
                            mode="review"
                            quiz={quiz}
                            answers={result.answers.map((a) => a.user_answer)}
                            setAnswers={() => undefined}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            remainingSeconds={null}
                            totalSeconds={null}
                            elapsed={result.time_spent_seconds}
                            submitting={false}
                            onSubmit={() => undefined}
                            onExit={() => setMode('idle')}
                            result={result}
                        />
                    </motion.div>
                )}

                {mode === 'completed' && result && (
                    <motion.div
                        key="completed"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                    >
                        <CompletedView
                            result={result}
                            onRetake={start}
                            onReview={startReview}
                            onDone={() => setMode('idle')}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmDeleteModal
                open={confirmingDelete}
                onClose={() => setConfirmingDelete(false)}
                onConfirm={handleDelete}
                isProcessing={deleting}
            />
        </AppLayout>
    );
}

function IdleView({
    quiz,
    attempts,
    bestScore,
    showAiModel,
    onStart,
    onDelete,
    onReviewAttempt,
}: {
    quiz: QuizData;
    attempts: AttemptSummary[];
    bestScore: number | null;
    showAiModel: boolean;
    onStart: () => void;
    onDelete: () => void;
    onReviewAttempt: (id: number) => void;
}) {
    const t = useT();

    const preferences = quiz.preferences ?? {};
    const preferenceEntries = Object.entries(preferences).filter(
        ([, value]) => typeof value === 'string' && value.trim().length > 0,
    );
    const inlineChips = preferenceEntries.slice(0, 4).map(([, value]) => value);

    return (
        <div className="space-y-8">
            <div className="space-y-6">
                <Link
                    href="/app/library"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
                >
                    <ArrowLeft size={16} />
                    {t('courses.show.back_to_library', 'Back to Library')}
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/8 text-secondary text-xs font-bold rounded-lg">
                        <ClipboardList size={12} /> {t('library.type.quiz', 'Quiz')}
                    </span>
                    {inlineChips.map((value, i) => (
                        <span
                            key={`chip-${i}-${value}`}
                            className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg capitalize"
                        >
                            {value}
                        </span>
                    ))}
                    {showAiModel && quiz.ai_model_name && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg">
                            <Cpu size={11} /> {quiz.ai_model_name}
                        </span>
                    )}
                </div>

                <div>
                    <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                        {quiz.title}
                    </h1>
                    {quiz.description && (
                        <p className="text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
                            {quiz.description}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 space-y-6">
                    <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-8 text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center mb-5 shadow-lg shadow-secondary/20">
                            <Play size={28} className="text-white" fill="currentColor" />
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-3 text-on-surface-variant">
                            <HelpCircle size={14} />
                            <span className="text-sm font-bold">
                                {t('quizzes.show.questions_count', '{count} questions', {
                                    count: quiz.question_count,
                                })}
                            </span>
                        </div>
                        <h2 className="text-xl font-headline font-extrabold text-on-surface mb-2">
                            {t('quizzes.show.ready.heading', 'Ready when you are')}
                        </h2>
                        <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                            {t(
                                'quizzes.show.ready.description',
                                "You'll see one question at a time. You can navigate between questions before submitting.",
                            )}
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onStart}
                            disabled={quiz.question_count === 0}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-secondary to-secondary-container text-white font-headline font-bold text-sm rounded-2xl shadow-lg shadow-secondary/20 hover:shadow-secondary/30 transition-all disabled:opacity-50"
                        >
                            <Sparkles size={16} />
                            {attempts.length > 0
                                ? t('quizzes.show.start_again', 'Start Again')
                                : t('quizzes.show.start', 'Start Quiz')}
                        </motion.button>
                    </div>

                    {attempts.length > 0 && (
                        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
                            <div className="px-5 py-3 border-b border-surface-container flex items-center gap-2">
                                <Trophy size={14} className="text-secondary" />
                                <h3 className="font-headline font-bold text-on-surface text-sm">
                                    {t('quizzes.show.attempts.title', 'Previous Attempts')}
                                </h3>
                            </div>
                            <div className="divide-y divide-surface-container">
                                {attempts.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex items-center gap-3 px-5 py-2.5"
                                    >
                                        <ScoreBadge score={a.score} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-on-surface truncate">
                                                {t(
                                                    'quizzes.result.correct_of',
                                                    '{correct} of {total} correct',
                                                    {
                                                        correct: a.correct_count,
                                                        total: a.total_questions,
                                                    },
                                                )}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-0.5">
                                                <span>{a.completed_at ?? ''}</span>
                                                <span className="flex items-center gap-1">
                                                    <Timer size={11} />
                                                    {formatDuration(a.time_spent_seconds)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onReviewAttempt(a.id)}
                                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-secondary bg-secondary/8 hover:bg-secondary/15 rounded-lg transition-all"
                                        >
                                            <Eye size={12} />
                                            {t('quizzes.result.review', 'Review Answers')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-4">
                    <div className="sticky top-28 space-y-5">
                        {bestScore !== null && (
                            <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl p-6 border border-secondary/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy size={16} className="text-secondary" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                                        {t('quizzes.show.best_score', 'Best Score')}
                                    </p>
                                </div>
                                <p className="text-4xl font-headline font-black text-on-surface">
                                    {bestScore}%
                                </p>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {t(
                                        'quizzes.show.best_score.hint',
                                        'Across {count} attempts',
                                        { count: attempts.length },
                                    )}
                                </p>
                            </div>
                        )}

                        <GenerationDetailsCard
                            language={quiz.language}
                            preferences={preferences}
                            aiModelName={quiz.ai_model_name}
                            showAiModel={showAiModel}
                        />

                        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
                            <h3 className="text-sm font-bold text-on-surface mb-3">
                                {t('courses.show.actions.title', 'Actions')}
                            </h3>
                            <button
                                onClick={onDelete}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-error hover:bg-error/5 rounded-xl transition-all"
                            >
                                <Trash2 size={16} />
                                {t('quizzes.show.actions.delete', 'Delete Quiz')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GenerationDetailsCard({
    language,
    preferences,
    aiModelName,
    showAiModel,
}: {
    language: string | null;
    preferences: Record<string, string>;
    aiModelName: string | null;
    showAiModel: boolean;
}) {
    const t = useT();
    const entries = Object.entries(preferences).filter(
        ([, value]) => typeof value === 'string' && value.trim().length > 0,
    );

    const hasContent = language || entries.length > 0 || (showAiModel && aiModelName);
    if (!hasContent) return null;

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-secondary" />
                <h3 className="text-sm font-bold text-on-surface">
                    {t('quizzes.show.generation.title', 'Generation Details')}
                </h3>
            </div>

            <div className="space-y-3 text-sm">
                {language && (
                    <DetailRow
                        icon={<Globe size={13} />}
                        label={t('quizzes.show.generation.language', 'Language')}
                        value={language}
                    />
                )}
                {showAiModel && aiModelName && (
                    <DetailRow
                        icon={<Cpu size={13} />}
                        label={t('quizzes.show.generation.model', 'AI Model')}
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
        </div>
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
                <span className="text-secondary">{icon}</span>
                {label}
            </span>
            <span className="text-xs font-semibold text-on-surface text-right truncate">
                {value}
            </span>
        </div>
    );
}

type RunnerMode = 'play' | 'review';

function QuizRunner({
    mode,
    quiz,
    answers,
    setAnswers,
    currentIndex,
    setCurrentIndex,
    remainingSeconds,
    totalSeconds,
    elapsed,
    submitting,
    onSubmit,
    onExit,
    result,
}: {
    mode: RunnerMode;
    quiz: QuizData;
    answers: string[];
    setAnswers: (a: string[]) => void;
    currentIndex: number;
    setCurrentIndex: (i: number) => void;
    remainingSeconds: number | null;
    totalSeconds: number | null;
    elapsed: number;
    submitting: boolean;
    onSubmit: () => void;
    onExit: () => void;
    result?: AttemptResult;
}) {
    const t = useT();
    const total = quiz.questions.length;
    const question = quiz.questions[currentIndex];
    const isLast = currentIndex === total - 1;
    const isReview = mode === 'review';
    const unanswered = answers.filter((a) => !a.trim()).length;
    const progressPct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

    const lowTime =
        !isReview &&
        totalSeconds !== null &&
        remainingSeconds !== null &&
        remainingSeconds < 30;

    const timerDisplay =
        remainingSeconds !== null ? formatDuration(remainingSeconds) : formatDuration(elapsed);

    const setAnswer = (value: string) => {
        if (isReview) return;
        const next = [...answers];
        next[currentIndex] = value;
        setAnswers(next);
    };

    const handleSubmit = () => {
        if (unanswered > 0) {
            const ok = window.confirm(
                t(
                    'quizzes.play.confirm_submit',
                    'You have {count} unanswered question(s). Submit anyway?',
                    { count: unanswered },
                ),
            );
            if (!ok) return;
        }
        onSubmit();
    };

    const questionState = (i: number): 'current' | 'correct' | 'incorrect' | 'answered' | 'neutral' => {
        if (i === currentIndex) return 'current';
        if (isReview && result) {
            const a = result.answers[i];
            if (!a) return 'neutral';
            return a.is_correct ? 'correct' : 'incorrect';
        }
        return answers[i]?.trim().length > 0 ? 'answered' : 'neutral';
    };

    const currentAnswer = isReview && result ? result.answers[currentIndex] : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-28 lg:self-start">
                <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-container flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                {isReview
                                    ? t('quizzes.review.kicker', 'Review')
                                    : t('quizzes.play.kicker', 'Quiz in Progress')}
                            </p>
                            <p className="text-sm font-bold text-on-surface truncate mt-0.5">
                                {quiz.title}
                            </p>
                        </div>
                        <button
                            onClick={onExit}
                            title={
                                isReview
                                    ? t('quizzes.review.exit', 'Back to Quiz')
                                    : t('quizzes.play.exit', 'Exit quiz')
                            }
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-on-surface-variant">
                                {t('quizzes.play.question_of', 'Question {current} of {total}', {
                                    current: currentIndex + 1,
                                    total,
                                })}
                            </p>
                            {isReview ? (
                                result ? (
                                    <span className="text-xs font-bold text-secondary">
                                        {result.score}%
                                    </span>
                                ) : null
                            ) : (
                                <span className="text-xs font-semibold text-on-surface-variant">
                                    {t('quizzes.play.answered', '{count} answered', {
                                        count: total - unanswered,
                                    })}
                                </span>
                            )}
                        </div>
                        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-secondary to-secondary-container rounded-full"
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        {!isReview && (
                            <div
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-bold tabular-nums transition-colors ${
                                    lowTime
                                        ? 'bg-error/10 text-error'
                                        : 'bg-surface-container-low text-on-surface'
                                }`}
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    <Timer size={14} />
                                    {totalSeconds !== null
                                        ? t('quizzes.play.time_remaining', 'Time remaining')
                                        : t('quizzes.play.time_elapsed', 'Elapsed')}
                                </div>
                                <span>{timerDisplay}</span>
                            </div>
                        )}
                    </div>

                    <div className="px-5 pb-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2.5">
                            {t('quizzes.play.questions_label', 'Questions')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {quiz.questions.map((_, i) => (
                                <QuestionNumberButton
                                    key={i}
                                    number={i + 1}
                                    state={questionState(i)}
                                    onClick={() => setCurrentIndex(i)}
                                />
                            ))}
                        </div>
                    </div>

                    {isReview && (
                        <div className="px-5 pb-5">
                            <button
                                onClick={onExit}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-sm rounded-xl transition-all"
                            >
                                <ArrowLeft size={16} />
                                {t('quizzes.review.back_to_quiz', 'Back to Quiz')}
                            </button>
                        </div>
                    )}
                </div>

                {isReview && result && (
                    <div className="grid grid-cols-2 gap-2">
                        <MiniTile
                            label={t('quizzes.result.correct', 'Correct')}
                            value={`${result.correct_count}/${result.total_questions}`}
                            tone="secondary"
                        />
                        <MiniTile
                            label={t('quizzes.stat.time_limit', 'Time Limit')}
                            value={formatDuration(result.time_spent_seconds)}
                            tone="neutral"
                        />
                    </div>
                )}
            </aside>

            <div className="lg:col-span-8 xl:col-span-9">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.22 }}
                        className="space-y-5"
                    >
                        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-6 md:p-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    {t('quizzes.result.question_label', 'Question {index}', {
                                        index: currentIndex + 1,
                                    })}
                                </span>
                                {isReview && currentAnswer && (
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                            currentAnswer.is_correct
                                                ? 'bg-secondary/10 text-secondary'
                                                : 'bg-error/10 text-error'
                                        }`}
                                    >
                                        {currentAnswer.is_correct
                                            ? t('quizzes.result.correct', 'Correct')
                                            : t('quizzes.result.incorrect', 'Incorrect')}
                                    </span>
                                )}
                            </div>

                            {question && (
                                <>
                                    <h2 className="text-xl md:text-2xl font-headline font-extrabold text-on-surface leading-snug mb-6">
                                        {question.question}
                                    </h2>

                                    <QuestionAnswer
                                        question={question}
                                        value={answers[currentIndex] ?? ''}
                                        onChange={setAnswer}
                                        readOnly={isReview}
                                        reveal={isReview}
                                        isCorrect={currentAnswer?.is_correct}
                                    />
                                </>
                            )}
                        </div>

                        {isReview && question && currentAnswer && !currentAnswer.is_correct && (
                            <ReviewInsight question={question} />
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container border border-surface-container transition-all disabled:opacity-40"
                            >
                                <ArrowLeft size={16} />
                                {t('quizzes.play.previous', 'Previous')}
                            </button>

                            {isReview ? (
                                <button
                                    onClick={() =>
                                        setCurrentIndex(Math.min(total - 1, currentIndex + 1))
                                    }
                                    disabled={isLast}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/15 hover:brightness-110 transition-all disabled:opacity-40"
                                >
                                    {t('quizzes.play.next', 'Next')}
                                    <ArrowRight size={16} />
                                </button>
                            ) : isLast ? (
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-secondary to-secondary-container text-white font-headline font-bold text-sm rounded-xl shadow-md shadow-secondary/20 hover:shadow-secondary/30 transition-all disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {t('quizzes.play.submitting', 'Submitting...')}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            {t('quizzes.play.submit', 'Submit Quiz')}
                                        </>
                                    )}
                                </motion.button>
                            ) : (
                                <button
                                    onClick={() =>
                                        setCurrentIndex(Math.min(total - 1, currentIndex + 1))
                                    }
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/15 hover:brightness-110 transition-all"
                                >
                                    {t('quizzes.play.next', 'Next')}
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function QuestionNumberButton({
    number,
    state,
    onClick,
}: {
    number: number;
    state: 'current' | 'correct' | 'incorrect' | 'answered' | 'neutral';
    onClick: () => void;
}) {
    const styles: Record<typeof state, string> = {
        current: 'bg-secondary text-white shadow-md shadow-secondary/30 ring-2 ring-secondary/30 ring-offset-2 ring-offset-surface-container-lowest',
        correct: 'bg-secondary/15 text-secondary hover:bg-secondary/20',
        incorrect: 'bg-error/10 text-error hover:bg-error/15',
        answered: 'bg-secondary/15 text-secondary hover:bg-secondary/20',
        neutral:
            'bg-surface-container-low text-on-surface-variant border border-surface-container hover:border-secondary/30',
    };
    return (
        <button
            onClick={onClick}
            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${styles[state]}`}
        >
            {number}
        </button>
    );
}

function QuestionAnswer({
    question,
    value,
    onChange,
    readOnly,
    reveal,
    isCorrect,
}: {
    question: Question;
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    reveal?: boolean;
    isCorrect?: boolean;
}) {
    const t = useT();

    if (question.type === 'short-answer') {
        const inputBorder = reveal
            ? isCorrect
                ? 'border-secondary bg-secondary/8 text-secondary'
                : 'border-error bg-error/8 text-error'
            : readOnly
              ? 'border-surface-container'
              : 'border-surface-container focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50';

        return (
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={t(
                            'quizzes.play.short_answer_placeholder',
                            'Type your answer...',
                        )}
                        readOnly={readOnly}
                        disabled={readOnly}
                        className={`w-full px-5 py-4 pr-14 rounded-xl border-2 bg-surface-container-low font-semibold placeholder:text-outline-variant focus:outline-none transition-all ${
                            readOnly ? 'cursor-default' : ''
                        } ${inputBorder}`}
                        autoFocus={!readOnly}
                    />
                    {reveal && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isCorrect ? (
                                <CheckCircle2 size={20} className="text-secondary" />
                            ) : (
                                <XCircle size={20} className="text-error" />
                            )}
                        </span>
                    )}
                </div>
                {reveal && !isCorrect && (
                    <div className="px-4 py-3 rounded-xl bg-secondary/8 border border-secondary/30">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
                            {t('quizzes.result.correct_answer', 'Correct Answer')}
                        </p>
                        <p className="text-sm font-semibold text-on-surface">
                            {question.correct_answer}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    const options = question.options.length > 0 ? question.options : ['True', 'False'];

    return (
        <div className="space-y-2">
            {options.map((option, i) => {
                const isSelected = value === option;
                const isCorrectOption = option === question.correct_answer;
                const letter = String.fromCharCode(65 + i);

                let base =
                    'bg-surface-container-low border-transparent hover:border-secondary/30 hover:bg-surface-container';
                let iconNode: React.ReactNode = null;
                let circleClass =
                    isSelected
                        ? 'bg-secondary text-white'
                        : 'bg-surface-container text-on-surface-variant';

                if (reveal) {
                    if (isCorrectOption) {
                        base =
                            'bg-secondary/10 border-secondary text-on-surface';
                        iconNode = (
                            <CheckCircle2
                                size={16}
                                className="text-secondary flex-shrink-0"
                            />
                        );
                        circleClass = 'bg-secondary text-white';
                    } else if (isSelected) {
                        base = 'bg-error/10 border-error text-on-surface';
                        iconNode = (
                            <XCircle size={16} className="text-error flex-shrink-0" />
                        );
                        circleClass = 'bg-error text-white';
                    } else {
                        base =
                            'bg-surface-container-low border-transparent opacity-60';
                        circleClass = 'bg-surface-container text-on-surface-variant';
                    }
                } else if (isSelected) {
                    base =
                        'bg-secondary/8 border-secondary text-on-surface shadow-md shadow-secondary/10';
                    iconNode = (
                        <CheckCircle2 size={16} className="text-secondary flex-shrink-0" />
                    );
                }

                return (
                    <button
                        key={`${i}-${option}`}
                        onClick={() => onChange(option)}
                        disabled={readOnly}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all border-2 ${base} ${
                            readOnly ? 'cursor-default' : 'cursor-pointer'
                        }`}
                    >
                        <span
                            className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold transition-colors ${circleClass}`}
                        >
                            {letter}
                        </span>
                        <span className="flex-1 font-medium text-sm">
                            {option}
                        </span>
                        {iconNode}
                    </button>
                );
            })}
        </div>
    );
}

function ReviewInsight({
    question,
}: {
    question: Question;
}) {
    const t = useT();

    if (!question.explanation) return null;

    return (
        <div className="rounded-2xl p-5 bg-surface-container-lowest border border-surface-container">
            <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={16} className="text-tertiary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t('quizzes.result.explanation', 'Explanation')}
                </p>
            </div>
            <p className="text-sm text-on-surface leading-relaxed">
                {question.explanation}
            </p>
        </div>
    );
}

function CompletedView({
    result,
    onRetake,
    onReview,
    onDone,
}: {
    result: AttemptResult;
    onRetake: () => void;
    onReview: () => void;
    onDone: () => void;
}) {
    const t = useT();
    const score = result.score;
    const tier = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

    const tierCopy: Record<typeof tier, { label: string; note: string }> = {
        excellent: {
            label: t('quizzes.result.tier.excellent', 'Excellent!'),
            note: t(
                'quizzes.result.tier.excellent_note',
                "Outstanding work — you've mastered this topic.",
            ),
        },
        good: {
            label: t('quizzes.result.tier.good', 'Well done'),
            note: t(
                'quizzes.result.tier.good_note',
                'Solid performance. Review the questions you missed to tighten up.',
            ),
        },
        fair: {
            label: t('quizzes.result.tier.fair', 'Not bad'),
            note: t(
                'quizzes.result.tier.fair_note',
                'A few gaps to close. Try reviewing the answers and giving it another go.',
            ),
        },
        poor: {
            label: t('quizzes.result.tier.poor', 'Keep going'),
            note: t(
                'quizzes.result.tier.poor_note',
                'Review the explanations, then retake when you feel ready.',
            ),
        },
    };

    const ring =
        tier === 'excellent' || tier === 'good'
            ? 'text-secondary'
            : tier === 'fair'
              ? 'text-tertiary'
              : 'text-error';

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-surface-container-lowest rounded-3xl border border-surface-container p-8 md:p-10 text-center overflow-hidden relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative inline-block"
                >
                    <ScoreRing score={score} colorClass={ring} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mt-6"
                >
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
                        {t('quizzes.result.kicker', 'Quiz Complete')}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight">
                        {tierCopy[tier].label}
                    </h1>
                    <p className="text-sm text-on-surface-variant mt-2 max-w-md mx-auto leading-relaxed">
                        {tierCopy[tier].note}
                    </p>
                </motion.div>

                <div className="flex items-stretch gap-3 mt-8 max-w-lg mx-auto">
                    <SummaryPill
                        icon={<CheckCircle2 size={14} />}
                        label={t('quizzes.result.correct', 'Correct')}
                        value={`${result.correct_count}/${result.total_questions}`}
                    />
                    <SummaryPill
                        icon={<Timer size={14} />}
                        label={t('quizzes.result.time_spent_label', 'Time')}
                        value={formatDuration(result.time_spent_seconds)}
                    />
                    <SummaryPill
                        icon={<Trophy size={14} />}
                        label={t('quizzes.result.score_label', 'Score')}
                        value={`${score}%`}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8 pt-6 border-t border-surface-container">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onReview}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-secondary to-secondary-container text-white font-headline font-bold text-sm rounded-xl shadow-md shadow-secondary/20 hover:shadow-secondary/30 transition-all"
                    >
                        <Eye size={16} />
                        {t('quizzes.result.review', 'Review Answers')}
                    </motion.button>
                    <button
                        onClick={onRetake}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container border border-surface-container transition-all"
                    >
                        <RefreshCcw size={16} />
                        {t('quizzes.result.retake', 'Retake Quiz')}
                    </button>
                    <button
                        onClick={onDone}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                        <ListChecks size={16} />
                        {t('quizzes.result.done', 'Done')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ScoreRing({ score, colorClass }: { score: number; colorClass: string }) {
    const size = 180;
    const stroke = 16;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    className="text-surface-container"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.1, ease: 'easeOut', delay: 0.1 }}
                    className={colorClass}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-baseline">
                    <span
                        className="font-headline font-black text-on-surface tabular-nums leading-none"
                        style={{ fontSize: '3rem' }}
                    >
                        {score}
                    </span>
                    <span
                        className="font-headline font-black text-secondary leading-none ml-1"
                        style={{ fontSize: '1.5rem' }}
                    >
                        %
                    </span>
                </div>
            </div>
        </div>
    );
}

function SummaryPill({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex-1 min-w-0 bg-surface-container-low rounded-2xl p-3.5 border border-surface-container">
            <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
                {icon}
                <p className="text-[10px] font-bold uppercase tracking-widest truncate">
                    {label}
                </p>
            </div>
            <p className="text-base md:text-lg font-headline font-black text-on-surface tabular-nums truncate">
                {value}
            </p>
        </div>
    );
}

function MiniTile({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'secondary' | 'neutral';
}) {
    const color =
        tone === 'secondary'
            ? 'text-secondary'
            : 'text-on-surface';
    return (
        <div className="bg-surface-container-lowest rounded-xl p-3 border border-surface-container">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 truncate">
                {label}
            </p>
            <p className={`text-sm font-headline font-black tabular-nums ${color}`}>
                {value}
            </p>
        </div>
    );
}

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 90
            ? 'bg-secondary text-white'
            : score >= 70
              ? 'bg-secondary/15 text-secondary'
              : score >= 50
                ? 'bg-tertiary/15 text-tertiary'
                : 'bg-error/10 text-error';
    return (
        <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black tabular-nums flex-shrink-0 ${color}`}
        >
            {score}%
        </div>
    );
}

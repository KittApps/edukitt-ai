import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import {
    ClipboardList,
    Cpu,
    Crown,
    Globe,
    Settings2,
    Sparkles,
} from 'lucide-react';

import StepIndicator from '@/Components/Shared/StepIndicator';
import CustomDropdown, {
    type CustomDropdownOption,
} from '@/Components/Shared/CustomDropdown';
import TopicInput from '@/Components/CreateQuiz/TopicInput';
import ConfigSection from '@/Components/CreateQuiz/ConfigSection';
import { useLocale, useT } from '@/lib/i18n';
import { submitAiGeneration } from '@/lib/aiGeneration';
import {
    loadAiGenerationPrefs,
    resolveInitialAssignment,
    resolveInitialLanguage,
    saveAiGenerationPrefs,
} from '@/lib/aiGenerationPrefs';

const PREFS_KEY = 'quiz';

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

interface ModelOptionDto {
    id: number;
    name: string;
    is_default: boolean;
    is_paid_only: boolean;
}

interface LanguageOptionDto {
    code: string;
    name: string;
    is_default?: boolean;
}

interface GlobalConfigDto {
    user_can_select_model: boolean;
    show_language_selector: boolean;
}

interface Props {
    personalizeGroups?: PersonalizeGroupDto[];
    personalizeDefaults?: Record<string, string>;
    personalizeEnabled?: boolean;
    availableModels?: ModelOptionDto[];
    supportedLanguages?: LanguageOptionDto[];
    globalConfig?: GlobalConfigDto;
    isPaidUser?: boolean;
}

/**
 * Stable identifier for each visible pane. Tracking by key (not index)
 * lets the wizard collapse the Personalize step when an admin disables
 * it without leaving us stranded on a step that no longer exists.
 */
type StepKey = 'topic' | 'personalize' | 'generating';

const DEFAULT_TIME_LIMIT = '10 min';

export default function Create({
    personalizeGroups = [],
    personalizeDefaults = {},
    personalizeEnabled = true,
    availableModels = [],
    supportedLanguages = [],
    globalConfig = {
        user_can_select_model: false,
        show_language_selector: false,
    },
    isPaidUser = false,
}: Props) {
    const t = useT();
    const locale = useLocale();

    const [topic, setTopic] = useState('');
    const [personalization, setPersonalization] = useState<Record<string, string>>(
        () => ({ ...personalizeDefaults }),
    );
    // time_limit is UI-only quiz scaffolding — never threaded into the
    // AI prompt itself, just stored alongside the Quiz row.
    const [timeLimit, setTimeLimit] = useState<string>(DEFAULT_TIME_LIMIT);
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial language / model picks come from the user's last-saved
    // selection in the `aigen_prefs_quiz` cookie (validated against
    // current options) and fall back to the admin defaults. See
    // {@link resolveInitialLanguage} / {@link resolveInitialAssignment}.
    const [language, setLanguage] = useState<string | null>(() => {
        const saved = loadAiGenerationPrefs(PREFS_KEY);
        return resolveInitialLanguage(saved.language, supportedLanguages, locale.code);
    });
    const [assignmentId, setAssignmentId] = useState<number | null>(() => {
        const saved = loadAiGenerationPrefs(PREFS_KEY);
        return resolveInitialAssignment(saved.assignmentId, availableModels, isPaidUser);
    });

    // Visible step list, derived from the per-task admin toggle. When
    // Personalize is OFF the wizard collapses to Topic → Generating
    // and the Ready-to-go card moves onto Topic to host the Generate
    // button itself.
    const stepKeys = useMemo<StepKey[]>(() => {
        const keys: StepKey[] = ['topic'];
        if (personalizeEnabled) keys.push('personalize');
        keys.push('generating');
        return keys;
    }, [personalizeEnabled]);

    const stepLabels = useMemo(
        () =>
            stepKeys.map((k) => {
                switch (k) {
                    case 'topic':
                        return t('quizzes.create.step.topic', 'Topic');
                    case 'personalize':
                        return t(
                            'quizzes.create.step.personalize',
                            'Personalize',
                        );
                    case 'generating':
                        return t(
                            'quizzes.create.step.generating',
                            'Generating',
                        );
                }
            }),
        [stepKeys, t],
    );

    // The Ready-to-go card (with the language + model picker and the
    // primary Generate button) lives on whichever step is the last
    // input before Generating. Mirrors the Quick Learn pattern.
    const readyCardKey: StepKey = personalizeEnabled ? 'personalize' : 'topic';
    const generatingKey: StepKey = 'generating';

    const [currentKey, setCurrentKey] = useState<StepKey>('topic');
    const currentIndex = Math.max(0, stepKeys.indexOf(currentKey));

    const showLanguagePicker =
        globalConfig.show_language_selector && supportedLanguages.length > 0;
    const showModelPicker =
        globalConfig.user_can_select_model && availableModels.length > 0;

    const languageOptions = useMemo<CustomDropdownOption<string>[]>(
        () =>
            supportedLanguages.map((l) => ({
                value: l.code,
                label: l.name,
            })),
        [supportedLanguages],
    );

    const modelOptions = useMemo<CustomDropdownOption<number>[]>(
        () =>
            availableModels.map((m) => {
                const lockedForPlan = m.is_paid_only && !isPaidUser;
                return {
                    value: m.id,
                    label: m.name,
                    icon: Cpu,
                    badge: m.is_paid_only ? <PaidOnlyBadge /> : undefined,
                    disabled: lockedForPlan,
                    disabledHint: lockedForPlan
                        ? t(
                              'quizzes.create.model.paid_only',
                              'Available on a paid plan',
                          )
                        : undefined,
                };
            }),
        [availableModels, isPaidUser, t],
    );

    const goBack = () => {
        const idx = stepKeys.indexOf(currentKey);
        if (idx > 0) setCurrentKey(stepKeys[idx - 1]);
    };

    const goNext = () => {
        const idx = stepKeys.indexOf(currentKey);
        if (idx >= 0 && idx < stepKeys.length - 1) {
            setCurrentKey(stepKeys[idx + 1]);
        }
    };

    const handleGenerate = async () => {
        // Remember the user's picks for next time. Invisible pickers
        // store `null` so a later admin config change can't reuse a
        // stale selection.
        saveAiGenerationPrefs(PREFS_KEY, {
            language: showLanguagePicker ? language : null,
            assignmentId: showModelPicker ? assignmentId : null,
        });

        setIsGenerating(true);
        setCurrentKey(generatingKey);
        try {
            // submitAiGeneration handles both sync and queued backends
            // transparently — the wizard's "Generating..." screen
            // stays up either way.
            const data = await submitAiGeneration<{ redirect?: string }>(
                '/app/quizzes/generate',
                {
                    topic,
                    preferences: personalization,
                    time_limit: timeLimit,
                    // Both are sent only when their global toggle is ON;
                    // the backend ignores them otherwise so a tampered
                    // client can't bypass the admin's choice.
                    assignment_id: showModelPicker ? assignmentId : null,
                    language: showLanguagePicker ? language : null,
                },
            );
            if (data.redirect) {
                window.location.href = data.redirect;
                return;
            }
        } catch (error) {
            console.error('Failed to generate quiz:', error);
            setCurrentKey(readyCardKey);
        } finally {
            setIsGenerating(false);
        }
    };

    const onReadyCardStep = currentKey === readyCardKey;
    const isInputStep = currentKey !== generatingKey;

    return (
        <AppLayout>
            <Head title={t('quizzes.create.title', 'Create Quiz')} />
            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <p className="text-sm font-semibold text-secondary mb-2 uppercase tracking-wider flex items-center gap-2">
                        <ClipboardList size={16} />
                        {t('quizzes.create.kicker', 'Create New Quiz')}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                        {t(
                            'quizzes.create.heading',
                            'Build an AI-powered quiz',
                        )}
                    </h1>
                    <p className="text-on-surface-variant mt-2 max-w-xl">
                        {t(
                            'quizzes.create.description',
                            'Choose a topic and customize the settings. The AI will generate questions, answers, and explanations automatically.',
                        )}
                    </p>
                </motion.div>

                <StepIndicator
                    steps={stepLabels}
                    currentStep={currentIndex}
                    colorClass="bg-secondary"
                />

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8 space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentKey}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentKey === 'topic' && (
                                    <TopicInput
                                        topic={topic}
                                        setTopic={setTopic}
                                    />
                                )}

                                {currentKey === 'personalize' && (
                                    <ConfigSection
                                        personalization={personalization}
                                        setPersonalization={setPersonalization}
                                        groups={personalizeGroups}
                                        timeLimit={timeLimit}
                                        setTimeLimit={setTimeLimit}
                                    />
                                )}

                                {currentKey === 'generating' && (
                                    <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center">
                                        <div className="w-16 h-16 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin mx-auto mb-6" />
                                        <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-3">
                                            {t(
                                                'quizzes.create.generating.title',
                                                'Creating your quiz...',
                                            )}
                                        </h2>
                                        <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                                            {t(
                                                'quizzes.create.generating.description',
                                                'AI is generating questions and explanations for "{topic}". This usually takes a few seconds.',
                                                { topic },
                                            )}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {isInputStep && (
                            <div className="flex justify-between items-center mt-8">
                                <button
                                    onClick={goBack}
                                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                                        currentIndex === 0
                                            ? 'opacity-0 pointer-events-none'
                                            : 'text-on-surface-variant hover:text-on-surface bg-surface-container-lowest border border-surface-container'
                                    }`}
                                >
                                    {t('common.back', 'Back')}
                                </button>

                                {/* Continue only shows on input steps that
                                    DON'T host the Ready-to-go card; the card
                                    owns the primary Generate CTA on its
                                    own step. Compact width matches the
                                    Course wizard's Continue for visual
                                    consistency across all three wizards. */}
                                {!onReadyCardStep && (
                                    <button
                                        onClick={goNext}
                                        disabled={
                                            (currentKey === 'topic' &&
                                                !topic.trim()) ||
                                            isGenerating
                                        }
                                        className="px-8 py-3 bg-gradient-to-r from-secondary to-secondary-container text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:shadow-secondary/30 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {t('common.continue', 'Continue')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-4">
                        <div className="sticky top-28 space-y-4">
                            {onReadyCardStep ? (
                                <ReadyToGoCard
                                    topic={topic}
                                    isGenerating={isGenerating}
                                    onGenerate={handleGenerate}
                                    showLanguagePicker={showLanguagePicker}
                                    showModelPicker={showModelPicker}
                                    language={language}
                                    onLanguageChange={setLanguage}
                                    languageOptions={languageOptions}
                                    assignmentId={assignmentId}
                                    onAssignmentChange={setAssignmentId}
                                    modelOptions={modelOptions}
                                    showUpgradeHint={
                                        availableModels.some(
                                            (m) => m.is_paid_only,
                                        ) && !isPaidUser
                                    }
                                    t={t}
                                />
                            ) : (
                                <QuizSidebarTip
                                    stepKey={currentKey}
                                    t={t}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

interface ReadyToGoCardProps {
    topic: string;
    isGenerating: boolean;
    onGenerate: () => void;
    showLanguagePicker: boolean;
    showModelPicker: boolean;
    language: string | null;
    onLanguageChange: (v: string | null) => void;
    languageOptions: CustomDropdownOption<string>[];
    assignmentId: number | null;
    onAssignmentChange: (v: number | null) => void;
    modelOptions: CustomDropdownOption<number>[];
    showUpgradeHint: boolean;
    t: ReturnType<typeof useT>;
}

/**
 * Sticky right-rail card hosting the primary "Generate Quiz" button
 * plus the optional language / model pickers. Mirrors the same card
 * used by Quick Learn and Course Create so all three wizards feel
 * identical to the user.
 */
function ReadyToGoCard({
    topic,
    isGenerating,
    onGenerate,
    showLanguagePicker,
    showModelPicker,
    language,
    onLanguageChange,
    languageOptions,
    assignmentId,
    onAssignmentChange,
    modelOptions,
    showUpgradeHint,
    t,
}: ReadyToGoCardProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary">
                    <Sparkles size={18} />
                </div>
                <h3 className="font-headline font-bold text-on-surface">
                    {t('quizzes.create.ready.title', 'Ready to go')}
                </h3>
            </div>
            {topic && (
                <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                        {t('quizzes.create.insight.topic', 'Topic')}
                    </p>
                    <h4
                        className="font-headline font-bold text-on-surface leading-snug line-clamp-1 break-words"
                        title={topic}
                    >
                        {topic}
                    </h4>
                </>
            )}

            {(showLanguagePicker || showModelPicker) && (
                <div className="mt-4 space-y-3">
                    {showLanguagePicker && (
                        <CustomDropdown<string>
                            label={t(
                                'quizzes.create.language.label',
                                'Language',
                            )}
                            value={language}
                            options={languageOptions}
                            onChange={onLanguageChange}
                            triggerIcon={Globe}
                            placeholder={t(
                                'quizzes.create.language.placeholder',
                                'Select language…',
                            )}
                        />
                    )}
                    {showModelPicker && (
                        <CustomDropdown<number>
                            label={t(
                                'quizzes.create.model.label',
                                'AI model',
                            )}
                            value={assignmentId}
                            options={modelOptions}
                            onChange={onAssignmentChange}
                            triggerIcon={Cpu}
                            placeholder={t(
                                'quizzes.create.model.placeholder',
                                'Select model…',
                            )}
                            panelHeader={
                                showUpgradeHint
                                    ? t(
                                          'quizzes.create.model.upgrade_hint',
                                          'Upgrade your plan to unlock crown-marked models.',
                                      )
                                    : undefined
                            }
                        />
                    )}
                </div>
            )}

            <button
                onClick={onGenerate}
                disabled={!topic.trim() || isGenerating}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-secondary to-secondary-container text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('common.generating', 'Generating...')}
                    </>
                ) : (
                    <>
                        <Sparkles size={16} />{' '}
                        {t('quizzes.create.generate', 'Generate Quiz')}
                    </>
                )}
            </button>
        </div>
    );
}

/**
 * Right-rail companion card for steps that DON'T host the Ready-to-go
 * card. Shows a contextual one-liner tied to whatever the user is
 * currently editing. The old "Your Selections" card is intentionally
 * gone — duplicate state that the live form already shows.
 */
function QuizSidebarTip({
    stepKey,
    t,
}: {
    stepKey: StepKey;
    t: ReturnType<typeof useT>;
}) {
    const tip = (() => {
        switch (stepKey) {
            case 'topic':
                return {
                    icon: <ClipboardList size={18} />,
                    title: t('quizzes.insight.topic.title', 'Topic Tips'),
                    body: t(
                        'quizzes.insight.topic.description',
                        "Narrow your topic for more focused and relevant questions — e.g. 'Python list comprehensions' instead of just 'Python'.",
                    ),
                };
            case 'personalize':
                return {
                    icon: <Settings2 size={18} />,
                    title: t(
                        'quizzes.insight.personalize.title',
                        'Personalization',
                    ),
                    body: t(
                        'quizzes.insight.personalize.description',
                        'Pick the question count, difficulty, and time limit that fit your goal. The AI mixes multiple-choice and true/false questions automatically.',
                    ),
                };
            case 'generating':
                return {
                    icon: <Sparkles size={18} />,
                    title: t(
                        'quizzes.insight.ready.title',
                        'Hang tight',
                    ),
                    body: t(
                        'quizzes.insight.ready.description',
                        'The AI is generating questions, answers, and explanations based on your topic and settings.',
                    ),
                };
        }
    })();

    return (
        <motion.div
            key={stepKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary">
                    {tip.icon}
                </div>
                <h3 className="font-headline font-bold text-on-surface">
                    {tip.title}
                </h3>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
                {tip.body}
            </p>
        </motion.div>
    );
}

function PaidOnlyBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
            <Crown size={10} /> Paid
        </span>
    );
}

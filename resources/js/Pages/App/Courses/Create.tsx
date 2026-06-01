import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { BookOpen, Cpu, Crown, Globe, Sparkles } from 'lucide-react';
import StepIndicator from '@/Components/Shared/StepIndicator';
import CustomDropdown, {
    type CustomDropdownOption,
} from '@/Components/Shared/CustomDropdown';
import TopicInput from '@/Components/CreateCourse/TopicInput';
import PersonalizationSection from '@/Components/CreateCourse/PersonalizationSection';
import ResourceUpload from '@/Components/CreateCourse/ResourceUpload';
import OutlineReview from '@/Components/CreateCourse/OutlineReview';
import { useLocale, useT } from '@/lib/i18n';
import { submitAiGeneration } from '@/lib/aiGeneration';
import {
    loadAiGenerationPrefs,
    resolveInitialAssignment,
    resolveInitialLanguage,
    saveAiGenerationPrefs,
} from '@/lib/aiGenerationPrefs';

const PREFS_KEY = 'course';

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
    merge_course_generation: boolean;
    show_language_selector: boolean;
}

interface ResourcesConfigDto {
    enabled: boolean;
    max_files: number;
    max_file_size_mb: number;
}

interface Props {
    personalizeGroups?: PersonalizeGroupDto[];
    personalizeDefaults?: Record<string, string>;
    personalizeEnabled?: boolean;
    resourcesConfig?: ResourcesConfigDto;
    availableModels?: ModelOptionDto[];
    supportedLanguages?: LanguageOptionDto[];
    globalConfig?: GlobalConfigDto;
    isPaidUser?: boolean;
}

/**
 * Stable identifier for the four possible wizard panes. We derive the
 * visible step list from these keys (rather than hardcoded indexes) so
 * an admin toggling Personalize/Resources off mid-session can't strand
 * the wizard on a step that no longer renders.
 */
type StepKey = 'topic' | 'resources' | 'personalize' | 'review';

export default function Create({
    personalizeGroups = [],
    personalizeDefaults = {},
    personalizeEnabled = true,
    resourcesConfig = { enabled: false, max_files: 5, max_file_size_mb: 10 },
    availableModels = [],
    supportedLanguages = [],
    globalConfig = {
        user_can_select_model: false,
        merge_course_generation: false,
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
    const [resources, setResources] = useState<File[]>([]);
    const [outline, setOutline] = useState<any[] | null>(null);
    // Course-level metadata the AI now returns alongside the modules.
    // Held separately so a regenerate call swaps them atomically with
    // the outline rather than leaking the previous run's title.
    const [aiTitle, setAiTitle] = useState<string | null>(null);
    const [aiDescription, setAiDescription] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial language / model picks come from the user's last-saved
    // selection in the `aigen_prefs_course` cookie (validated against
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

    // Build the visible step list from the per-task admin toggles.
    // Topic and Review are always present; Resources and Personalize
    // appear only when their respective toggle is ON. Tracking the
    // current step as a key (not an index) means the wizard can't get
    // stranded if the toggles change between renders.
    const stepKeys = useMemo<StepKey[]>(() => {
        const keys: StepKey[] = ['topic'];
        if (resourcesConfig.enabled) keys.push('resources');
        if (personalizeEnabled) keys.push('personalize');
        keys.push('review');
        return keys;
    }, [resourcesConfig.enabled, personalizeEnabled]);

    const stepLabels = useMemo(() => {
        const labelFor = (k: StepKey): string => {
            switch (k) {
                case 'topic':
                    return t('courses.create.step.topic', 'Topic');
                case 'resources':
                    return t('courses.create.step.resources', 'Resources');
                case 'personalize':
                    return t('courses.create.step.personalize', 'Personalize');
                case 'review':
                    return t('courses.create.step.review', 'Review');
            }
        };
        return stepKeys.map(labelFor);
    }, [stepKeys, t]);

    // The Ready-to-go card (with the language + model picker and the
    // primary Generate button) lives on the LAST input step before
    // Review. Cascade: Personalize → Resources → Topic, matching the
    // visibility rules above.
    const readyCardKey: StepKey = personalizeEnabled
        ? 'personalize'
        : resourcesConfig.enabled
          ? 'resources'
          : 'topic';

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
                              'courses.create.model.paid_only',
                              'Available on a paid plan',
                          )
                        : undefined,
                };
            }),
        [availableModels, isPaidUser, t],
    );

    const goToStep = (key: StepKey) => {
        if (stepKeys.includes(key)) setCurrentKey(key);
    };

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

    const canProceed = () => {
        if (currentKey === 'topic') return topic.trim().length > 0;
        if (currentKey === 'review') return outline !== null;
        return true;
    };

    const generateOutline = async (regenerateText?: string) => {
        // Remember the user's picks for next time. Invisible pickers
        // store `null` so a later admin config change can't reuse a
        // stale selection.
        saveAiGenerationPrefs(PREFS_KEY, {
            language: showLanguagePicker ? language : null,
            assignmentId: showModelPicker ? assignmentId : null,
        });

        setIsGenerating(true);
        try {
            const formData = new FormData();
            formData.append('topic', topic);
            if (personalizeEnabled) {
                Object.entries(personalization).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        formData.append(`preferences[${key}]`, value);
                    }
                });
            }
            if (resourcesConfig.enabled) {
                // Defensive cap: ResourceUpload already enforces this
                // on add, but the admin can lower the limit while a
                // tab is open. The server caps via Laravel validation
                // either way; slicing here keeps the payload tight.
                resources
                    .slice(0, resourcesConfig.max_files)
                    .forEach((file) =>
                        formData.append('resources[]', file),
                    );
            }
            if (regenerateText) {
                formData.append('regenerate_instructions', regenerateText);
            }
            if (showModelPicker && assignmentId !== null) {
                formData.append('assignment_id', String(assignmentId));
            }
            if (showLanguagePicker && language !== null) {
                formData.append('language', language);
            }

            // Queue-aware submit: when the admin "Process AI requests
            // via queue" toggle is on, the controller dispatches a
            // job and the helper silently polls until the outline is
            // ready, returning the same `{ title, description, outline }`
            // shape the sync path used to return inline.
            const data = await submitAiGeneration<{
                title?: string | null;
                description?: string | null;
                outline: unknown[];
            }>('/app/courses/generate-outline', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setOutline(data.outline as never[]);
            setAiTitle(data.title ?? null);
            setAiDescription(data.description ?? null);
            goToStep('review');
        } catch (error) {
            console.error('Failed to generate outline:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAcceptAndCreate = async () => {
        if (!outline) return;
        setIsGenerating(true);
        try {
            const response = await axios.post('/app/courses', {
                topic,
                preferences: personalization,
                outline,
                // Course-level metadata generated by the AI alongside
                // the outline. The server falls back to topic / first
                // module blurb if these are missing or empty.
                title: aiTitle,
                description: aiDescription,
                // Persist on the course so future lesson generations
                // inherit the same output language without re-asking.
                language: showLanguagePicker ? language : null,
                // Echo the selected assignment so the server can snapshot
                // the same AI model name onto the course row.
                assignment_id: showModelPicker ? assignmentId : null,
            });

            if (response.data.redirect) {
                window.location.href = response.data.redirect;
            }
        } catch (error) {
            console.error('Failed to create course:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const renderStep = () => {
        switch (currentKey) {
            case 'topic':
                return <TopicInput topic={topic} setTopic={setTopic} />;
            case 'resources':
                return (
                    <ResourceUpload
                        resources={resources}
                        setResources={setResources}
                        maxFiles={resourcesConfig.max_files}
                        maxFileSizeMb={resourcesConfig.max_file_size_mb}
                    />
                );
            case 'personalize':
                return (
                    <PersonalizationSection
                        personalization={personalization}
                        setPersonalization={setPersonalization}
                        groups={personalizeGroups}
                    />
                );
            case 'review':
                return (
                    <OutlineReview
                        outline={outline!}
                        onRegenerate={generateOutline}
                        onAccept={handleAcceptAndCreate}
                        isGenerating={isGenerating}
                    />
                );
            default:
                return null;
        }
    };

    const onReadyCardStep = currentKey === readyCardKey;
    const isLastInputStep = currentKey !== 'review';
    const isOnGenerateStep = currentKey === readyCardKey;

    return (
        <AppLayout>
            <Head title={t('courses.create.title', 'Create Course')} />
            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen size={16} />
                        {t('courses.create.kicker', 'Create New Course')}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                        {t(
                            'courses.create.heading',
                            'Design your learning path',
                        )}
                    </h1>
                    <p className="text-on-surface-variant mt-2 max-w-xl">
                        {t(
                            'courses.create.description',
                            'Tell the AI what you want to learn. It will generate a personalized, structured course tailored to your preferences.',
                        )}
                    </p>
                </motion.div>

                <StepIndicator
                    steps={stepLabels}
                    currentStep={currentIndex}
                />

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentKey}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {renderStep()}
                            </motion.div>
                        </AnimatePresence>

                        {isLastInputStep && (
                            <div className="flex justify-between mt-8">
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
                                {/* The Continue button only shows on input steps
                                    that DON'T host the Ready-to-go card; the card
                                    owns the primary CTA on its own step. */}
                                {!isOnGenerateStep && (
                                    <button
                                        onClick={goNext}
                                        disabled={!canProceed() || isGenerating}
                                        className="px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                    onGenerate={() => generateOutline()}
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
                                <CourseSidebarTip
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
 * Sticky right-rail card that owns the primary "Generate Outline"
 * action and the optional language/model pickers. Lives on whichever
 * step (Topic / Resources / Personalize) is the last visible input
 * for the current admin config — see `readyCardKey` derivation in the
 * parent component.
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
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Sparkles size={18} />
                </div>
                <h3 className="font-headline font-bold text-on-surface">
                    {t('courses.create.ready.title', 'Ready to go')}
                </h3>
            </div>
            {topic && (
                <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                        {t('courses.create.insight.topic', 'Topic')}
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
                            label={t('courses.create.language.label', 'Language')}
                            value={language}
                            options={languageOptions}
                            onChange={onLanguageChange}
                            triggerIcon={Globe}
                            placeholder={t(
                                'courses.create.language.placeholder',
                                'Select language…',
                            )}
                        />
                    )}
                    {showModelPicker && (
                        <CustomDropdown<number>
                            label={t('courses.create.model.label', 'AI model')}
                            value={assignmentId}
                            options={modelOptions}
                            onChange={onAssignmentChange}
                            triggerIcon={Cpu}
                            placeholder={t(
                                'courses.create.model.placeholder',
                                'Select model…',
                            )}
                            panelHeader={
                                showUpgradeHint
                                    ? t(
                                          'courses.create.model.upgrade_hint',
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
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('common.generating', 'Generating...')}
                    </>
                ) : (
                    <>
                        <Sparkles size={16} />{' '}
                        {t(
                            'courses.create.generate_outline',
                            'Generate Outline',
                        )}
                    </>
                )}
            </button>
        </div>
    );
}

/**
 * Right-rail companion card for steps that DON'T host the Ready-to-go
 * card. Shows a contextual one-liner tied to whatever the user is
 * currently editing (Topic / Resources / Personalize / Review).
 */
function CourseSidebarTip({
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
                    title: t('courses.insight.topic.title', 'Topic Tips'),
                    body: t(
                        'courses.insight.topic.description',
                        'Be specific about what you want to learn. Include subtopics or areas of focus for better results.',
                    ),
                };
            case 'resources':
                return {
                    title: t(
                        'courses.insight.resources.title',
                        'Resources',
                    ),
                    body: t(
                        'courses.insight.resources.description',
                        'Upload reference materials, textbooks, or notes. The AI will incorporate key concepts from your files.',
                    ),
                };
            case 'personalize':
                return {
                    title: t(
                        'courses.insight.personalize.title',
                        'Personalization',
                    ),
                    body: t(
                        'courses.insight.personalize.description',
                        'Customize your learning experience. These preferences help the AI tailor content to your level and style.',
                    ),
                };
            case 'review':
                return {
                    title: t(
                        'courses.insight.review.title',
                        'Review',
                    ),
                    body: t(
                        'courses.insight.review.description',
                        'Review the generated outline. You can regenerate with specific feedback or accept and start learning.',
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
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <BookOpen size={18} />
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

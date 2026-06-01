import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, Crown, Globe, Sparkles, Zap } from 'lucide-react';
import StepIndicator from '@/Components/Shared/StepIndicator';
import ChipSelector from '@/Components/Shared/ChipSelector';
import CustomDropdown, {
    type CustomDropdownOption,
} from '@/Components/Shared/CustomDropdown';
import { useLocale, useT } from '@/lib/i18n';
import { submitAiGeneration } from '@/lib/aiGeneration';
import {
    loadAiGenerationPrefs,
    resolveInitialAssignment,
    resolveInitialLanguage,
    saveAiGenerationPrefs,
} from '@/lib/aiGenerationPrefs';

const PREFS_KEY = 'quick_learn';

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
    const [currentStep, setCurrentStep] = useState(0);
    const [topic, setTopic] = useState('');
    const [preferences, setPreferences] = useState<Record<string, string>>(
        () => ({ ...personalizeDefaults }),
    );
    const [isGenerating, setIsGenerating] = useState(false);

    // Personalize is an admin-controlled per-task toggle. When OFF
    // the wizard becomes Topic → Generating (no Personalize step);
    // the Ready-to-go card with the Generate button moves onto the
    // Topic step so users can launch straight from there.
    const generatingStep = personalizeEnabled ? 2 : 1;
    const readyCardStep = personalizeEnabled ? 1 : 0;

    // Default-selected language / model. Resolution order (per
    // {@link resolveInitialLanguage} / {@link resolveInitialAssignment}):
    //   1. The user's last pick from `aigen_prefs_quick_learn` cookie
    //      — validated against the current options so a withdrawn
    //      model or removed language silently falls through.
    //   2. The admin-flagged default for this task.
    //   3. First eligible row, then any row.
    // Both are nullable for the "global toggle is off" case where we
    // don't render the corresponding dropdown at all.
    const [language, setLanguage] = useState<string | null>(() => {
        const saved = loadAiGenerationPrefs(PREFS_KEY);
        return resolveInitialLanguage(saved.language, supportedLanguages, locale.code);
    });
    const [assignmentId, setAssignmentId] = useState<number | null>(() => {
        const saved = loadAiGenerationPrefs(PREFS_KEY);
        return resolveInitialAssignment(saved.assignmentId, availableModels, isPaidUser);
    });

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
                              'quick_learns.create.model.paid_only',
                              'Available on a paid plan',
                          )
                        : undefined,
                };
            }),
        [availableModels, isPaidUser, t],
    );

    const steps = [
        t('quick_learns.create.step.topic', 'Topic'),
        ...(personalizeEnabled
            ? [t('quick_learns.create.step.personalize', 'Personalize')]
            : []),
        t('quick_learns.create.step.generating', 'Generating'),
    ];

    const handleGenerate = async () => {
        // Persist the user's picks for next time. We only save fields
        // whose picker is currently visible — invisible pickers store
        // `null` so the cookie can't outlive an admin config change.
        saveAiGenerationPrefs(PREFS_KEY, {
            language: showLanguagePicker ? language : null,
            assignmentId: showModelPicker ? assignmentId : null,
        });

        setIsGenerating(true);
        setCurrentStep(generatingStep);
        try {
            // submitAiGeneration transparently handles the queue path:
            // if the backend dispatched a job it polls the status
            // endpoint and resolves with the same shape the sync path
            // would have returned. The wizard's "Generating..." view
            // stays up either way.
            const data = await submitAiGeneration<{ redirect?: string }>(
                '/app/quick-learns/generate',
                {
                    topic,
                    preferences,
                    // Both are sent only when their global toggle is ON;
                    // the backend ignores them otherwise so a tampered
                    // client can't bypass the admin's choice.
                    assignment_id: showModelPicker ? assignmentId : null,
                    language: showLanguagePicker ? language : null,
                },
            );
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        } catch (error) {
            console.error('Failed to generate:', error);
            setCurrentStep(readyCardStep);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AppLayout>
            <Head title={t('quick_learns.create.title', 'Quick Learn')} />
            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <p className="text-sm font-semibold text-tertiary mb-2 uppercase tracking-wider flex items-center gap-2">
                        <Zap size={16} />
                        {t('quick_learns.create.kicker', 'Create Quick Learn')}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                        {t('quick_learns.create.heading', 'Learn something in minutes')}
                    </h1>
                    <p className="text-on-surface-variant mt-2 max-w-xl">
                        {t(
                            'quick_learns.create.description',
                            'Pick a topic and the AI will generate a concise, bite-sized lesson you can finish in one sitting.',
                        )}
                    </p>
                </motion.div>

                <StepIndicator steps={steps} currentStep={currentStep} colorClass="bg-tertiary" />

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentStep === 0 && (
                                    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container space-y-5">
                                        <div>
                                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 block">
                                                {t(
                                                    'quick_learns.create.topic.label',
                                                    'What do you want a quick lesson on?',
                                                )}
                                            </label>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 p-2.5 rounded-xl bg-tertiary/10 text-tertiary flex-shrink-0">
                                                    <Zap size={20} />
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    value={topic}
                                                    onChange={(e) => setTopic(e.target.value)}
                                                    placeholder={t(
                                                        'quick_learns.create.topic.placeholder',
                                                        'Enter a topic or question...',
                                                    )}
                                                    className="w-full bg-transparent text-on-surface text-lg font-headline font-bold placeholder:text-outline-variant resize-none focus:outline-none leading-relaxed"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
                                            <Sparkles size={14} className="text-tertiary" />
                                            <p className="text-xs text-on-surface-variant">
                                                {t(
                                                    'quick_learns.create.topic.hint',
                                                    'Keep it focused — quick learns work best with a single concept.',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {personalizeEnabled && currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="space-y-8 bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
                                            {personalizeGroups.length === 0 ? (
                                                <p className="text-sm text-on-surface-variant text-center py-4">
                                                    {t(
                                                        'quick_learns.create.personalize.empty',
                                                        'No personalization options available. The AI will use default settings.',
                                                    )}
                                                </p>
                                            ) : (
                                                personalizeGroups.map((group) => (
                                                    <ChipSelector
                                                        key={group.key}
                                                        label={t(
                                                            `quick_learns.create.${group.key}.label`,
                                                            group.label,
                                                        )}
                                                        options={group.options.map(
                                                            (o) => o.value,
                                                        )}
                                                        selected={preferences[group.key] || ''}
                                                        onSelect={(v) =>
                                                            setPreferences({
                                                                ...preferences,
                                                                [group.key]: v,
                                                            })
                                                        }
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {currentStep === generatingStep && (
                                    <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center">
                                        <div className="w-16 h-16 border-4 border-tertiary/20 border-t-tertiary rounded-full animate-spin mx-auto mb-6" />
                                        <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-3">
                                            {t(
                                                'quick_learns.create.generating.title',
                                                'Creating your Quick Learn...',
                                            )}
                                        </h2>
                                        <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                                            {t(
                                                'quick_learns.create.generating.description',
                                                'AI is generating personalized content on "{topic}". This usually takes a few seconds.',
                                                { topic },
                                            )}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {currentStep < generatingStep && (
                            <div className="flex justify-between mt-8">
                                <button
                                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                                        currentStep === 0
                                            ? 'opacity-0 pointer-events-none'
                                            : 'text-on-surface-variant hover:text-on-surface bg-surface-container-lowest border border-surface-container'
                                    }`}
                                >
                                    {t('common.back', 'Back')}
                                </button>
                                {/* Continue only when there's a Personalize step
                                    to advance to; otherwise the Topic step's
                                    right-rail card hosts the Generate button. */}
                                {personalizeEnabled && currentStep === 0 && (
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        disabled={!topic.trim() || isGenerating}
                                        className="px-8 py-3 bg-gradient-to-r from-tertiary to-orange-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-tertiary/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {t('common.continue', 'Continue')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-4">
                        <div className="sticky top-28 space-y-4">
                            {currentStep === readyCardStep && (
                                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 rounded-xl bg-tertiary/10 text-tertiary">
                                            <Sparkles size={18} />
                                        </div>
                                        <h3 className="font-headline font-bold text-on-surface">
                                            {t(
                                                'quick_learns.create.ready.title',
                                                'Ready to go',
                                            )}
                                        </h3>
                                    </div>
                                    {topic && (
                                        <>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                                                {t(
                                                    'quick_learns.create.insight.topic',
                                                    'Topic',
                                                )}
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
                                                        'quick_learns.create.language.label',
                                                        'Language',
                                                    )}
                                                    value={language}
                                                    options={languageOptions}
                                                    onChange={setLanguage}
                                                    triggerIcon={Globe}
                                                    placeholder={t(
                                                        'quick_learns.create.language.placeholder',
                                                        'Select language…',
                                                    )}
                                                />
                                            )}
                                            {showModelPicker && (
                                                <CustomDropdown<number>
                                                    label={t(
                                                        'quick_learns.create.model.label',
                                                        'AI model',
                                                    )}
                                                    value={assignmentId}
                                                    options={modelOptions}
                                                    onChange={setAssignmentId}
                                                    triggerIcon={Cpu}
                                                    placeholder={t(
                                                        'quick_learns.create.model.placeholder',
                                                        'Select model…',
                                                    )}
                                                    panelHeader={
                                                        availableModels.some(
                                                            (m) => m.is_paid_only,
                                                        ) && !isPaidUser
                                                            ? t(
                                                                  'quick_learns.create.model.upgrade_hint',
                                                                  'Upgrade your plan to unlock crown-marked models.',
                                                              )
                                                            : undefined
                                                    }
                                                />
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGenerate}
                                        disabled={!topic.trim() || isGenerating}
                                        className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-tertiary to-orange-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-tertiary/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={16} />{' '}
                                        {t(
                                            'quick_learns.create.generate',
                                            'Generate',
                                        )}
                                    </button>
                                </div>
                            )}

                            {currentStep !== readyCardStep && (
                                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 rounded-xl bg-tertiary/10 text-tertiary">
                                            <Zap size={18} />
                                        </div>
                                        <h3 className="font-headline font-bold text-on-surface">
                                            {t(
                                                'quick_learns.create.insight.title',
                                                'Quick Learn',
                                            )}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-on-surface-variant leading-relaxed">
                                        {t(
                                            'quick_learns.create.insight.description',
                                            'Quick Learns are bite-sized, focused lessons on a single topic. Perfect for learning something new in just a few minutes.',
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/**
 * Crown pill rendered next to paid-only models in the model picker.
 * Subtle, monochrome amber so it reads as a hint rather than an
 * upgrade CTA — the actual upgrade flow lives elsewhere.
 */
function PaidOnlyBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
            <Crown size={10} /> Paid
        </span>
    );
}

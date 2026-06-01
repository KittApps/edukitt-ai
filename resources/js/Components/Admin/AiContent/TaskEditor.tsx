import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    Cpu,
    Globe,
    Lock,
    MessageSquareText,
    Settings as SettingsIcon,
    Shield,
    SlidersHorizontal,
    type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import GlobalConfigCard, { type GlobalConfig } from './GlobalConfigCard';
import PersonalizeOptionsCard, {
    type PersonalizeOptionGroup,
} from './PersonalizeOptionsCard';
import SupportedLanguagesPanel from './SupportedLanguagesPanel';
import TaskAssignmentsCard from './TaskAssignmentsCard';
import TaskConfigurationCard from './TaskConfigurationCard';
import TaskPromptCard, { type PromptPlaceholder } from './TaskPromptCard';
import type { AiContentTask, Provider } from './types';

export interface TaskPrompt {
    template: string;
    default: string;
    placeholders: PromptPlaceholder[];
    has_custom: boolean;
}

interface Props {
    task: AiContentTask;
    providers: Provider[];
    hasDefault: boolean;
    defaultProvider: Provider | undefined;
    defaultModel: Provider['models'][number] | undefined;
    personalizeGroups: PersonalizeOptionGroup[];
    personalizeTasks: string[];
    prompt: TaskPrompt | null;
    promptTasks: string[];
    globalConfig: GlobalConfig;
}

type SubTabKey = 'provider' | 'configuration' | 'languages' | 'personalize' | 'prompt';

interface SubTab {
    key: SubTabKey;
    label: string;
    icon: ComponentType<LucideProps>;
}

const PROVIDER_TAB: SubTab = { key: 'provider', label: 'AI Provider', icon: Cpu };
const CONFIGURATION_TAB: SubTab = {
    key: 'configuration',
    label: 'Configuration',
    icon: SettingsIcon,
};
const LANGUAGES_TAB: SubTab = {
    key: 'languages',
    label: 'Supported Languages',
    icon: Globe,
};
const PERSONALIZE_TAB: SubTab = {
    key: 'personalize',
    label: 'Personalize',
    icon: SlidersHorizontal,
};
const PROMPT_TAB: SubTab = { key: 'prompt', label: 'Prompt', icon: MessageSquareText };

export default function TaskEditor({
    task,
    providers,
    hasDefault,
    defaultProvider,
    defaultModel,
    personalizeGroups,
    personalizeTasks,
    prompt,
    promptTasks,
    globalConfig,
}: Props) {
    const isDefaultTask = task.key === 'default';
    const hasPersonalize = personalizeTasks.includes(task.key);
    const hasPromptEditor = promptTasks.includes(task.key) && prompt !== null;
    // The Default task gets the GLOBAL config tab + the Supported
    // Languages tab (its values are part of the same global config
    // payload, just edited separately); regular tasks get a per-task
    // config tab whenever the controller declared at least one
    // applicable config key for them.
    const hasGlobalConfig = isDefaultTask;
    const hasLanguagesTab = isDefaultTask;
    const hasTaskConfig = !isDefaultTask && task.applicable_config.length > 0;
    const hasConfiguration = hasGlobalConfig || hasTaskConfig;
    const hasSubTabs = hasConfiguration || hasLanguagesTab || hasPersonalize || hasPromptEditor;

    const subTabs: SubTab[] = [
        PROVIDER_TAB,
        ...(hasGlobalConfig ? [CONFIGURATION_TAB] : []),
        ...(hasLanguagesTab ? [LANGUAGES_TAB] : []),
        ...(hasPersonalize ? [PERSONALIZE_TAB] : []),
        ...(hasPromptEditor ? [PROMPT_TAB] : []),
        // Per-task config sits LAST — after Prompt — as the user
        // requested. Default task keeps its config tab right after
        // Provider since the global toggles set the stage for the
        // others.
        ...(hasTaskConfig ? [CONFIGURATION_TAB] : []),
    ];
    const [subTab, setSubTab] = useState<SubTabKey>('provider');

    // Reset to the provider tab whenever the active task changes; the
    // currently-selected sub-tab may not exist for the new task.
    useEffect(() => {
        setSubTab('provider');
    }, [task.id]);

    const providerCard = (
        <TaskAssignmentsCard
            task={task}
            providers={providers}
            hasDefault={hasDefault}
            defaultProvider={defaultProvider}
            defaultModel={defaultModel}
        />
    );

    const assignmentCount = task.assignments.length;

    return (
        <motion.div
            key={task.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden"
        >
            {/* Header */}
            <div
                className={`flex items-start justify-between gap-4 px-6 py-5 ${
                    hasSubTabs ? '' : 'border-b border-surface-container'
                }`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={`p-2.5 rounded-xl flex-shrink-0 ${
                            isDefaultTask
                                ? 'bg-amber-500/10 text-amber-600'
                                : task.is_internal
                                    ? 'bg-on-surface/10 text-on-surface-variant'
                                    : 'bg-primary/10 text-primary'
                        }`}
                    >
                        {isDefaultTask ? (
                            <Shield size={22} />
                        ) : task.is_internal ? (
                            <Lock size={22} />
                        ) : (
                            <Bot size={22} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-headline font-extrabold text-lg text-on-surface">
                            {task.label}
                        </h2>
                        <p className="text-xs text-on-surface-variant font-mono truncate">
                            Task: {task.key}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {task.is_internal && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-on-surface/10 px-2.5 py-1 rounded-full">
                            <Lock size={10} /> Internal
                        </span>
                    )}
                    {assignmentCount > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                            {assignmentCount === 1
                                ? 'Configured'
                                : `${assignmentCount} models`}
                        </span>
                    )}
                </div>
            </div>

            {/* Horizontal sub-tabs (for tasks that expose more than provider config) */}
            {hasSubTabs && (
                <div className="px-6 pb-2 border-b border-surface-container">
                    <SubTabBar
                        tabs={subTabs}
                        active={subTab}
                        onChange={setSubTab}
                    />
                </div>
            )}

            {/* Content */}
            <div className="p-6">
                {!hasSubTabs && providerCard}

                {hasSubTabs && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={subTab}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                        >
                            {subTab === 'provider' && providerCard}
                            {subTab === 'configuration' && hasGlobalConfig && (
                                <GlobalConfigCard initial={globalConfig} />
                            )}
                            {subTab === 'configuration' && hasTaskConfig && (
                                <TaskConfigurationCard task={task} />
                            )}
                            {subTab === 'languages' && hasLanguagesTab && (
                                <SupportedLanguagesPanel
                                    initial={globalConfig.supported_languages}
                                    selectorEnabled={globalConfig.show_language_selector}
                                />
                            )}
                            {subTab === 'personalize' && hasPersonalize && (
                                <PersonalizeOptionsCard
                                    embedded
                                    taskKey={task.key}
                                    initialGroups={personalizeGroups}
                                    disabled={!task.config.personalize_enabled}
                                />
                            )}
                            {subTab === 'prompt' && hasPromptEditor && prompt && (
                                <TaskPromptCard
                                    embedded
                                    taskKey={task.key}
                                    template={prompt.template}
                                    defaultTemplate={prompt.default}
                                    placeholders={prompt.placeholders}
                                    hasCustom={prompt.has_custom}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    );
}

// ─── Horizontal sub-tab bar ────────────────────────────────────────
function SubTabBar({
    tabs,
    active,
    onChange,
}: {
    tabs: SubTab[];
    active: SubTabKey;
    onChange: (key: SubTabKey) => void;
}) {
    return (
        <div className="flex items-center gap-1 -mx-1">
            {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = t.key === active;
                return (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => onChange(t.key)}
                        className={`relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-colors ${
                            isActive
                                ? 'text-primary'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Icon size={14} />
                        {t.label}
                        {isActive && (
                            <motion.span
                                layoutId="ai-content-subtab-underline"
                                className="absolute left-1 right-1 -bottom-px h-0.5 rounded-full bg-primary"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import {
    NavPanel,
    PageHeader,
    TwoColumnLayout,
} from '@/Components/Admin/Shared';
import {
    TaskEditor,
    TaskNavItem,
    type AiContentTask,
    type GlobalConfig,
    type PersonalizeOptionGroup,
    type Provider,
} from '@/Components/Admin/AiContent';
import type { TaskPrompt } from '@/Components/Admin/AiContent/TaskEditor';

/**
 * Cosmetic overrides applied when either global flag is ON:
 *   - `user_can_select_model` — implies the end-user UX combines
 *     outline + lesson, so the admin sidebar mirrors that.
 *   - `merge_course_generation` — an explicit opt-in to that same
 *     merged sidebar when the model picker is OFF.
 *
 * Effect: course outline + course lesson collapse into a single
 * "Course Generation" entry. Label-only — the lesson task still
 * exists on the server and is wired up exactly as before.
 */
const HIDDEN_TASKS_WHEN_MERGED = new Set(['course_lesson']);
const RENAME_TASKS_WHEN_MERGED: Record<string, string> = {
    course_outline: 'Course Generation',
};

interface Props {
    tasks: AiContentTask[];
    providers: Provider[];
    personalizeGroups: Record<string, PersonalizeOptionGroup[]>;
    personalizeTasks: string[];
    prompts: Record<string, TaskPrompt>;
    promptTasks: string[];
    globalConfig: GlobalConfig;
}

export default function AiContent({
    tasks,
    providers,
    personalizeGroups,
    personalizeTasks,
    prompts,
    promptTasks,
    globalConfig,
}: Props) {
    // Either flag triggers the merged sidebar. The model picker
    // implies it; the merge toggle is the explicit way to opt-in
    // when the picker is OFF.
    const mergeCourseGeneration =
        globalConfig.user_can_select_model || globalConfig.merge_course_generation;

    // Apply the cosmetic overrides once, here, so both the sidebar
    // and the editor header read from the same shape.
    const visibleTasks = useMemo<AiContentTask[]>(() => {
        return tasks
            .filter(
                (t) =>
                    !mergeCourseGeneration || !HIDDEN_TASKS_WHEN_MERGED.has(t.key),
            )
            .map((t) => {
                if (!mergeCourseGeneration) return t;
                const renamed = RENAME_TASKS_WHEN_MERGED[t.key];
                return renamed ? { ...t, label: renamed } : t;
            });
    }, [tasks, mergeCourseGeneration]);

    const [activeKey, setActiveKey] = useState<string>(
        visibleTasks[0]?.key ?? '',
    );

    // If the toggle change just hid the currently-active task (e.g.
    // admin was on `course_lesson` and flipped the global toggle),
    // fall back to the first still-visible task so we don't get
    // stuck on an empty editor.
    useEffect(() => {
        if (!visibleTasks.some((t) => t.key === activeKey)) {
            setActiveKey(visibleTasks[0]?.key ?? '');
        }
    }, [visibleTasks, activeKey]);

    const activeTask = useMemo(
        () => visibleTasks.find((t) => t.key === activeKey),
        [visibleTasks, activeKey],
    );

    const defaultTask = useMemo(
        () => visibleTasks.find((t) => t.key === 'default'),
        [visibleTasks],
    );
    const defaultAssignment = defaultTask?.assignments.find((a) => a.is_default);
    const hasDefault = Boolean(defaultAssignment);
    const defaultProvider = defaultAssignment
        ? providers.find((p) => p.id === defaultAssignment.ai_provider_id)
        : undefined;
    const defaultModel = defaultProvider?.models.find(
        (m) => m.id === defaultAssignment?.ai_provider_model_id,
    );

    return (
        <AdminLayout>
            <Head title="AI Content Settings" />
            <div className="space-y-6">
                <PageHeader
                    title="AI Content Configuration"
                    description="Approve which AI providers and models can run each generation task. The default-marked row is what runs today; additional rows will be offered to end users as model choices."
                />

                <TwoColumnLayout
                    aside={
                        <NavPanel label="Tasks">
                            {visibleTasks.map((task, index) => {
                                const isDefault = task.key === 'default';
                                return (
                                    <div key={task.key}>
                                        <TaskNavItem
                                            task={task}
                                            providers={providers}
                                            hasDefault={hasDefault}
                                            isActive={task.key === activeKey}
                                            onSelect={() => setActiveKey(task.key)}
                                        />
                                        {isDefault && index === 0 && visibleTasks.length > 1 && (
                                            <div className="my-2 mx-3 border-t border-surface-container" />
                                        )}
                                    </div>
                                );
                            })}
                        </NavPanel>
                    }
                >
                    {activeTask ? (
                        <TaskEditor
                            task={activeTask}
                            providers={providers}
                            hasDefault={hasDefault}
                            defaultProvider={defaultProvider}
                            defaultModel={defaultModel}
                            personalizeGroups={
                                personalizeGroups[activeTask.key] ?? []
                            }
                            personalizeTasks={personalizeTasks}
                            prompt={prompts[activeTask.key] ?? null}
                            promptTasks={promptTasks}
                            globalConfig={globalConfig}
                        />
                    ) : (
                        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center text-sm text-on-surface-variant">
                            Select a task from the list.
                        </div>
                    )}
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}

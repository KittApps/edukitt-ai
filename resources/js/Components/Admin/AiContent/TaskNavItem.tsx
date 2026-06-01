import { Lock, Shield, Sparkles } from 'lucide-react';
import type { AiContentTask, Provider } from './types';

interface Props {
    task: AiContentTask;
    providers: Provider[];
    hasDefault: boolean;
    isActive: boolean;
    onSelect: () => void;
}

export default function TaskNavItem({
    task,
    providers,
    hasDefault,
    isActive,
    onSelect,
}: Props) {
    const isDefault = task.key === 'default';
    const defaultAssignment = task.assignments.find((a) => a.is_default);
    const defaultProvider = defaultAssignment
        ? providers.find((p) => p.id === defaultAssignment.ai_provider_id)
        : undefined;
    const isConfigured = Boolean(defaultAssignment);
    const extraAssignments = Math.max(0, task.assignments.length - 1);

    const bg = isActive
        ? isDefault
            ? 'bg-amber-500/10 border border-amber-500/25'
            : 'bg-primary/10 border border-primary/15'
        : 'hover:bg-surface-container-low border border-transparent';

    const iconBg = isActive
        ? isDefault
            ? 'bg-amber-500 text-white'
            : 'bg-primary text-white'
        : isDefault
            ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/15'
            : 'bg-surface-container text-on-surface-variant group-hover:text-primary';

    const titleColor = isActive
        ? isDefault
            ? 'text-amber-700'
            : 'text-primary'
        : 'text-on-surface';

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${bg}`}
        >
            <div className={`p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
                {isDefault ? <Shield size={16} /> : <Sparkles size={16} />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <p
                        className={`text-sm font-bold leading-snug truncate min-w-0 ${titleColor}`}
                        title={task.label}
                    >
                        {task.label}
                    </p>
                    {isDefault && (
                        <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 px-1.5 py-0.5 rounded-full">
                            Fallback
                        </span>
                    )}
                    {task.is_internal && (
                        <span
                            className="flex-shrink-0 inline-flex items-center justify-center bg-on-surface/10 text-on-surface-variant w-4 h-4 rounded-full"
                            title="Internal task"
                            aria-label="Internal task"
                        >
                            <Lock size={9} />
                        </span>
                    )}
                    {extraAssignments > 0 && (
                        <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            +{extraAssignments}
                        </span>
                    )}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                    {isConfigured ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-semibold text-on-surface-variant truncate">
                                {defaultProvider?.name ?? 'Set'}
                            </span>
                        </>
                    ) : hasDefault && !isDefault ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-semibold text-amber-700 truncate">
                                Using default
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                Not set
                            </span>
                        </>
                    )}
                </div>
            </div>
        </button>
    );
}

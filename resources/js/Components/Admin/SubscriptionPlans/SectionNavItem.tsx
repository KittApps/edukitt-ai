import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { StatusDot, type StatusTone } from '@/Components/Admin/Shared';

interface Props {
    icon: ComponentType<LucideProps>;
    label: string;
    /** Optional short secondary line under the label (e.g. "$12 / month"). */
    hint?: ReactNode;
    /** Optional right-side status pill (uses the shared StatusDot). */
    status?: { tone: StatusTone; label: string; title?: string };
    isActive: boolean;
    onSelect: () => void;
}

export default function SectionNavItem({
    icon: Icon,
    label,
    hint,
    status,
    isActive,
    onSelect,
}: Props) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                    ? 'bg-primary/10 border border-primary/15'
                    : 'hover:bg-surface-container-low border border-transparent'
            }`}
        >
            <div
                className={`p-2 rounded-lg flex-shrink-0 ${
                    isActive
                        ? 'bg-primary text-white'
                        : 'bg-surface-container text-on-surface-variant group-hover:text-primary'
                }`}
            >
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p
                    className={`text-sm font-bold truncate ${
                        isActive ? 'text-primary' : 'text-on-surface'
                    }`}
                >
                    {label}
                </p>
                {hint && (
                    <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                        {hint}
                    </p>
                )}
            </div>
            {status && (
                <StatusDot
                    tone={status.tone}
                    label={status.label}
                    title={status.title}
                />
            )}
        </button>
    );
}

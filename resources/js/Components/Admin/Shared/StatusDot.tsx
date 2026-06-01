export type StatusTone = 'success' | 'warning' | 'muted' | 'info' | 'error';

interface Props {
    tone: StatusTone;
    label?: string;
    title?: string;
    className?: string;
}

const toneMap: Record<StatusTone, { dot: string; text: string }> = {
    success: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
    warning: { dot: 'bg-amber-500', text: 'text-amber-600' },
    muted: { dot: 'bg-outline-variant', text: 'text-on-surface-variant' },
    info: { dot: 'bg-primary', text: 'text-primary' },
    error: { dot: 'bg-red-500', text: 'text-red-600' },
};

export default function StatusDot({ tone, label, title, className = '' }: Props) {
    const { dot, text } = toneMap[tone];
    if (!label) {
        return (
            <span
                className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0 ${className}`}
                title={title}
            />
        );
    }
    return (
        <span
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${text} ${className}`}
            title={title}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    );
}

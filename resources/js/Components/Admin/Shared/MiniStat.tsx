export type MiniStatTone = 'success' | 'warning' | 'neutral';

interface Props {
    label: string;
    value: number | string;
    tone: MiniStatTone;
    hint?: string;
}

const toneMap: Record<MiniStatTone, string> = {
    success: 'text-emerald-700 bg-emerald-50',
    warning: 'text-amber-800 bg-amber-50',
    neutral: 'text-on-surface-variant bg-surface-container-low',
};

export default function MiniStat({ label, value, tone, hint }: Props) {
    return (
        <div className={`rounded-xl p-3 flex-1 min-w-0 ${toneMap[tone]}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 truncate">
                {label}
            </p>
            <p className="mt-0.5 text-lg font-headline font-extrabold tabular-nums">
                {value}
            </p>
            {hint && <p className="text-[10px] opacity-70 truncate">{hint}</p>}
        </div>
    );
}

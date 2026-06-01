interface Props {
    label: string;
    value: string | number;
    hint?: string;
}

export default function StatCard({ label, value, hint }: Props) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {label}
            </p>
            <p className="mt-1 text-xl font-headline font-extrabold text-on-surface truncate">
                {value}
            </p>
            {hint && (
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{hint}</p>
            )}
        </div>
    );
}

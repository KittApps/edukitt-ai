interface StatCardProps {
    value: string;
    label: string;
    colorClass: string;
}

export default function StatCard({ value, label, colorClass }: StatCardProps) {
    return (
        <div className="p-6 bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:scale-[1.03] hover:shadow-md border border-surface-container">
            <span className={`text-3xl font-headline font-black ${colorClass}`}>{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-1.5">
                {label}
            </span>
        </div>
    );
}

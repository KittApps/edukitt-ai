interface ChipSelectorProps {
    label: string;
    options: string[];
    selected: string;
    onSelect: (value: string) => void;
    colorClass?: string;
}

export default function ChipSelector({ label, options, selected, onSelect, colorClass = 'primary' }: ChipSelectorProps) {
    return (
        <div className="space-y-3">
            <label className="text-sm font-bold text-on-surface">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <button
                        key={option}
                        onClick={() => onSelect(option)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            selected === option
                                ? `bg-${colorClass} text-white shadow-lg shadow-${colorClass}/20`
                                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-surface-container'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
}

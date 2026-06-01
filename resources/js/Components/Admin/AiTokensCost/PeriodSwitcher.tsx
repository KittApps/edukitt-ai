import { PERIOD_OPTIONS, type Period } from './types';

interface Props {
    value: Period;
    onChange: (p: Period) => void;
}

export default function PeriodSwitcher({ value, onChange }: Props) {
    return (
        <div className="inline-flex p-1 bg-surface-container-lowest border border-surface-container rounded-xl">
            {PERIOD_OPTIONS.map((opt) => (
                <button
                    key={opt.key}
                    onClick={() => onChange(opt.key)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        value === opt.key
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

import { Braces } from 'lucide-react';

interface Props {
    placeholders: string[];
    missing?: string[];
}

export default function PlaceholderChips({ placeholders, missing = [] }: Props) {
    if (placeholders.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <Braces size={11} className="text-on-surface-variant" />
            {placeholders.map((p) => {
                const isMissing = missing.includes(p);
                return (
                    <span
                        key={p}
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            isMissing
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-primary/5 text-primary border-primary/15'
                        }`}
                        title={isMissing ? `Missing in translation: {${p}}` : `{${p}}`}
                    >
                        {`{${p}}`}
                    </span>
                );
            })}
        </div>
    );
}

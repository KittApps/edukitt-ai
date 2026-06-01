import { Star } from 'lucide-react';
import { StatusDot } from '@/Components/Admin/Shared';
import type { Language } from './types';

interface Props {
    language: Language;
    isActive: boolean;
    onSelect: () => void;
}

export default function LanguageNavItem({ language, isActive, onSelect }: Props) {
    const percent = Math.round(
        (language.translated_count / Math.max(language.total_count, 1)) * 100,
    );

    const activeBg = isActive
        ? language.is_default
            ? 'bg-amber-500/10 border border-amber-500/25'
            : 'bg-primary/10 border border-primary/15'
        : 'hover:bg-surface-container-low border border-transparent';

    const titleClass = isActive
        ? language.is_default
            ? 'text-amber-700'
            : 'text-primary'
        : 'text-on-surface';

    const barClass =
        percent === 100
            ? 'bg-emerald-500'
            : percent >= 50
                ? 'bg-primary'
                : percent > 0
                    ? 'bg-amber-500'
                    : 'bg-outline-variant';

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${activeBg}`}
        >
            <span className="text-2xl flex-shrink-0 leading-none">{language.flag}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-bold truncate ${titleClass}`}>
                        {language.name}
                    </p>
                    {language.is_default && (
                        <Star size={11} className="text-amber-500 fill-amber-500" />
                    )}
                    {language.direction === 'rtl' && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded">
                            RTL
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-on-surface-variant truncate">
                    {language.is_default
                        ? 'Base · All translations'
                        : `${language.native_name} · ${language.code}`}
                </p>
                {!language.is_default && (
                    <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-surface-container rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${barClass}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant tabular-nums">
                            {percent}%
                        </span>
                    </div>
                )}
            </div>
            {!language.is_active && !language.is_default && (
                <StatusDot tone="muted" title="Inactive" />
            )}
        </button>
    );
}

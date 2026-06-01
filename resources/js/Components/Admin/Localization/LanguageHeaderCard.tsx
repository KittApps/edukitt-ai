import { Pencil, Star, X } from 'lucide-react';
import { MiniStat } from '@/Components/Admin/Shared';
import type { Language } from './types';

interface Props {
    language: Language;
    isMaster: boolean;
    totalKeys: number;
    activeTargetCount: number;
    groupCount: number;
    onToggleActive: (isActive: boolean) => void;
    onEdit: () => void;
    onRemove: () => void;
}

export default function LanguageHeaderCard({
    language,
    isMaster,
    totalKeys,
    activeTargetCount,
    groupCount,
    onToggleActive,
    onEdit,
    onRemove,
}: Props) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-4xl leading-none">{language.flag}</span>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-headline font-extrabold text-xl text-on-surface">
                                {isMaster ? 'All Languages' : language.name}
                            </h2>
                            {language.is_default && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    <Star size={10} className="fill-current" /> Base
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-on-surface-variant mt-0.5">
                            {isMaster
                                ? `Translate every key into all active languages at once (base: ${language.name})`
                                : `${language.native_name} · ${language.code} · ${language.direction.toUpperCase()}`}
                        </p>
                    </div>
                </div>
                {!isMaster && (
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low border border-surface-container rounded-xl px-3 py-2">
                            <input
                                type="checkbox"
                                checked={language.is_active}
                                onChange={(e) => onToggleActive(e.target.checked)}
                                className="w-4 h-4 text-primary rounded border-surface-container focus:ring-primary/20"
                            />
                            <span className="text-xs font-semibold text-on-surface">Active</span>
                        </label>
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-low border border-surface-container rounded-lg transition-colors"
                        >
                            <Pencil size={13} /> Edit
                        </button>
                        {!language.is_default && (
                            <button
                                onClick={onRemove}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X size={13} /> Remove
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isMaster ? (
                <div className="mt-5 flex gap-3">
                    <MiniStat label="Total Keys" value={totalKeys} tone="neutral" />
                    <MiniStat
                        label="Languages"
                        value={activeTargetCount}
                        tone="success"
                        hint="active targets"
                    />
                    <MiniStat label="Groups" value={groupCount} tone="neutral" />
                </div>
            ) : (
                <div className="mt-5 flex gap-3">
                    <MiniStat
                        label="Translated"
                        value={language.translated_count}
                        tone="success"
                    />
                    <MiniStat
                        label="Missing"
                        value={language.total_count - language.translated_count}
                        tone="warning"
                    />
                    <MiniStat
                        label="Total"
                        value={language.total_count}
                        tone="neutral"
                    />
                </div>
            )}
        </div>
    );
}

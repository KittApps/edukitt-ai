import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import HighlightedText from './HighlightedText';
import PlaceholderChips from './PlaceholderChips';
import { findMissingPlaceholders, saveTranslation } from './helpers';
import type { FlattenedTranslation, Language, ValuesMap } from './types';

interface Props {
    translation: Pick<FlattenedTranslation, 'id' | 'key' | 'source' | 'placeholders'>;
    languages: Language[];
    values: ValuesMap;
    onSaved: () => void;
}

export default function MasterTranslationRow({
    translation,
    languages,
    values,
    onSaved,
}: Props) {
    const initial = useMemo(
        () =>
            Object.fromEntries(
                languages.map((l) => [
                    l.code,
                    values[l.code]?.[translation.key]?.value ?? '',
                ]),
            ),
        [languages, values, translation.key],
    );
    const [expanded, setExpanded] = useState(false);
    const [localValues, setLocalValues] = useState<Record<string, string>>(initial);
    const [savingCode, setSavingCode] = useState<string | null>(null);

    const filledCount = useMemo(
        () => Object.values(localValues).filter(Boolean).length,
        [localValues],
    );
    const totalCount = languages.length;

    const persist = async (langCode: string) => {
        if (localValues[langCode] === initial[langCode]) return;
        setSavingCode(langCode);
        try {
            await saveTranslation(langCode, translation.key, localValues[langCode]);
            onSaved();
        } finally {
            setSavingCode(null);
        }
    };

    const summaryClass =
        filledCount === totalCount && totalCount > 0
            ? 'text-emerald-600'
            : filledCount > 0
                ? 'text-primary'
                : 'text-on-surface-variant';

    return (
        <div className="hover:bg-surface-container-low/30 transition-colors">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left"
            >
                <div className="flex-1 min-w-0">
                    <code className="text-[11px] font-mono font-bold text-primary break-all">
                        {translation.key}
                    </code>
                    <p className="mt-1 text-sm text-on-surface line-clamp-2">
                        <HighlightedText text={translation.source} />
                    </p>
                    <PlaceholderChips placeholders={translation.placeholders} />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold tabular-nums ${summaryClass}`}>
                            {filledCount}/{totalCount}
                        </span>
                        <div className="flex -space-x-1">
                            {languages.slice(0, 4).map((l) => (
                                <span
                                    key={l.code}
                                    className={`text-sm leading-none border border-surface-container-lowest rounded-full bg-surface-container-low w-5 h-5 flex items-center justify-center ${
                                        localValues[l.code] ? 'opacity-100' : 'opacity-40'
                                    }`}
                                    title={`${l.name}: ${localValues[l.code] ? 'translated' : 'missing'}`}
                                >
                                    {l.flag}
                                </span>
                            ))}
                            {languages.length > 4 && (
                                <span className="border border-surface-container-lowest rounded-full bg-surface-container-low w-5 h-5 flex items-center justify-center text-[9px] font-bold text-on-surface-variant">
                                    +{languages.length - 4}
                                </span>
                            )}
                        </div>
                    </div>
                    <ChevronDown
                        size={16}
                        className={`text-on-surface-variant transition-transform ${
                            expanded ? 'rotate-180' : ''
                        }`}
                    />
                </div>
            </button>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-4 space-y-2 border-t border-surface-container bg-surface-container-low/20 pt-3">
                            {languages.map((lang) => (
                                <LanguageTranslationInput
                                    key={lang.code}
                                    language={lang}
                                    value={localValues[lang.code] ?? ''}
                                    placeholders={translation.placeholders}
                                    saving={savingCode === lang.code}
                                    onChange={(v) =>
                                        setLocalValues((prev) => ({
                                            ...prev,
                                            [lang.code]: v,
                                        }))
                                    }
                                    onBlur={() => persist(lang.code)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface LanguageInputProps {
    language: Language;
    value: string;
    placeholders: string[];
    saving: boolean;
    onChange: (v: string) => void;
    onBlur: () => void;
}

function LanguageTranslationInput({
    language,
    value,
    placeholders,
    saving,
    onChange,
    onBlur,
}: LanguageInputProps) {
    const isMissing = !value;
    const missing = findMissingPlaceholders(value, placeholders);
    const hasPlaceholderError = !isMissing && missing.length > 0;

    return (
        <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 w-28 flex-shrink-0 pt-2">
                <span className="text-lg leading-none">{language.flag}</span>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">
                        {language.name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-mono">
                        {language.code}
                    </p>
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-start gap-2">
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        placeholder={
                            placeholders.length
                                ? `Keep ${placeholders
                                      .map((p) => `{${p}}`)
                                      .join(', ')} as-is...`
                                : `Translate to ${language.name}...`
                        }
                        dir={language.direction}
                        rows={2}
                        className={`flex-1 bg-surface-container-lowest border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-y field-sizing-content leading-relaxed ${
                            hasPlaceholderError
                                ? 'border-red-300 bg-red-50/20 focus:ring-red-200'
                                : isMissing
                                    ? 'border-amber-300 bg-amber-50/20'
                                    : 'border-surface-container'
                        }`}
                    />
                    <div className="pt-2">
                        {saving ? (
                            <span className="block w-2 h-2 rounded-full bg-primary animate-pulse" />
                        ) : hasPlaceholderError ? (
                            <AlertTriangle size={16} className="text-red-500" />
                        ) : isMissing ? (
                            <span
                                className="block w-2 h-2 rounded-full bg-amber-500"
                                title="Missing translation"
                            />
                        ) : (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        )}
                    </div>
                </div>
                {hasPlaceholderError && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-red-600">
                        <AlertTriangle size={10} />
                        <span>Missing:</span>
                        {missing.map((p) => (
                            <code
                                key={p}
                                className="font-mono font-bold bg-red-50 border border-red-200 text-red-700 px-1 py-0.5 rounded"
                            >{`{${p}}`}</code>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import HighlightedText from './HighlightedText';
import PlaceholderChips from './PlaceholderChips';
import { findMissingPlaceholders, saveTranslation } from './helpers';
import type { FlattenedTranslation } from './types';

interface Props {
    translation: FlattenedTranslation;
    direction: 'ltr' | 'rtl';
    languageCode: string;
    onSaved: () => void;
}

export default function TranslationRow({
    translation,
    direction,
    languageCode,
    onSaved,
}: Props) {
    const [value, setValue] = useState(translation.translation);
    const [saving, setSaving] = useState(false);
    const isMissing = !value;
    const missingPlaceholders = findMissingPlaceholders(value, translation.placeholders);
    const hasPlaceholderError = !isMissing && missingPlaceholders.length > 0;

    const persist = async () => {
        if (value === translation.translation) return;
        setSaving(true);
        try {
            await saveTranslation(languageCode, translation.key, value);
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="px-5 py-4 flex flex-col md:flex-row gap-4 md:items-start hover:bg-surface-container-low/30 transition-colors">
            <div className="md:w-1/3 min-w-0">
                <code className="text-[11px] font-mono font-bold text-primary break-all">
                    {translation.key}
                </code>
                <p className="mt-1 text-sm text-on-surface line-clamp-3">
                    <HighlightedText text={translation.source} />
                </p>
                <PlaceholderChips
                    placeholders={translation.placeholders}
                    missing={missingPlaceholders}
                />
                {translation.updated_at && (
                    <p className="mt-1.5 text-[10px] text-on-surface-variant">
                        Updated {translation.updated_at}
                    </p>
                )}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onBlur={persist}
                            placeholder={
                                translation.placeholders.length
                                    ? `Keep ${translation.placeholders
                                          .map((p) => `{${p}}`)
                                          .join(', ')} as-is...`
                                    : 'Add translation...'
                            }
                            dir={direction}
                            rows={2}
                            className={`w-full bg-surface-container-low border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-y field-sizing-content leading-relaxed ${
                                hasPlaceholderError
                                    ? 'border-red-300 bg-red-50/30 focus:ring-red-200'
                                    : isMissing
                                        ? 'border-amber-300 bg-amber-50/30'
                                        : 'border-surface-container'
                            }`}
                        />
                    </div>
                    <div className="flex flex-col gap-1 pt-1">
                        {saving ? (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        ) : hasPlaceholderError ? (
                            <AlertTriangle size={16} className="text-red-500" />
                        ) : isMissing ? (
                            <span
                                className="w-2 h-2 rounded-full bg-amber-500"
                                title="Missing translation"
                            />
                        ) : (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        )}
                    </div>
                </div>
                {hasPlaceholderError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-600 pl-1 flex-wrap">
                        <AlertTriangle size={11} />
                        Missing placeholder
                        {missingPlaceholders.length > 1 ? 's' : ''}:{' '}
                        {missingPlaceholders.map((p) => (
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

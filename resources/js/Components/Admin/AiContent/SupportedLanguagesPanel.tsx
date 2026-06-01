import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Ban, Save } from 'lucide-react';

import SupportedLanguagesCard, {
    type SupportedLanguage,
} from './SupportedLanguagesCard';

interface Props {
    initial: SupportedLanguage[];
    /**
     * Mirrors the `show_language_selector` global toggle saved on
     * the Configuration tab. When false the editor stays usable so
     * admins can prep the list, but the header pill and a banner
     * make it clear end users currently bypass the language step.
     */
    selectorEnabled: boolean;
}

/**
 * Standalone editor for the supported-languages list. Sits on the
 * Default task's "Supported Languages" sub-tab and posts the same
 * /global-config endpoint as the toggles, but only with the
 * `supported_languages` key — the controller accepts a partial
 * payload so each tab owns its own slice cleanly.
 */
export default function SupportedLanguagesPanel({
    initial,
    selectorEnabled,
}: Props) {
    const [languages, setLanguages] = useState<SupportedLanguage[]>(initial);
    const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Re-sync when the prop refreshes (e.g. after a partial Inertia
    // reload triggered by another tab's save).
    useEffect(() => {
        setLanguages(initial);
        setSavedSnapshot(JSON.stringify(initial));
    }, [initial]);

    const dirty = useMemo(
        () => JSON.stringify(languages) !== savedSnapshot,
        [languages, savedSnapshot],
    );

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await axios.post('/admin/settings/ai-content/global-config', {
                supported_languages: languages,
            });
            setSavedSnapshot(JSON.stringify(languages));
            router.reload({ only: ['globalConfig'] });
        } catch (e: unknown) {
            const message =
                axios.isAxiosError(e) && e.response?.data?.message
                    ? String(e.response.data.message)
                    : 'Failed to save. Please try again.';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            {!selectorEnabled && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                    <Ban size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Language selector is disabled.</p>
                        <p className="mt-0.5 text-red-700">
                            End users won&apos;t see a language picker on the generation form.
                            You can keep editing the list here — it&apos;ll be ready when you
                            re-enable it from the Configuration tab.
                        </p>
                    </div>
                </div>
            )}

            <SupportedLanguagesCard
                value={languages}
                onChange={setLanguages}
                disabled={!selectorEnabled}
            />

            <div className="flex items-center justify-end gap-3">
                {error && (
                    <span className="text-[11px] text-red-600">{error}</span>
                )}
                {dirty && !error && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        Unsaved changes
                    </span>
                )}
                <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Save size={14} /> {saving ? 'Saving\u2026' : 'Save languages'}
                </button>
            </div>
        </div>
    );
}

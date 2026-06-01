import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Sparkles, Upload } from 'lucide-react';
import {
    NavPanel,
    PageHeader,
    StatCard,
    TwoColumnLayout,
} from '@/Components/Admin/Shared';
import {
    AddKeyModal,
    AddLanguageModal,
    AiTranslateModal,
    ExportTranslationsModal,
    ImportTranslationsModal,
    LanguageEditor,
    LanguageNavItem,
    SyncInfoBanner,
    type Language,
    type TranslationKey,
    type ValuesMap,
} from '@/Components/Admin/Localization';

interface Props {
    languages: Language[];
    keys: TranslationKey[];
    values: ValuesMap;
    last_sync_at: string | null;
}

export default function Localization({
    languages,
    keys,
    values,
    last_sync_at,
}: Props) {
    const defaultLang = languages.find((l) => l.is_default) ?? languages[0];
    const [activeCode, setActiveCode] = useState<string>(defaultLang?.code ?? '');
    const [showAddLanguage, setShowAddLanguage] = useState(false);
    const [showAddKey, setShowAddKey] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showAiTranslate, setShowAiTranslate] = useState(false);

    const activeLanguage = useMemo(
        () => languages.find((l) => l.code === activeCode),
        [languages, activeCode],
    );

    // If the active language disappears (e.g. just removed), fall back to default.
    useEffect(() => {
        if (!activeLanguage && defaultLang) {
            setActiveCode(defaultLang.code);
        }
    }, [activeLanguage, defaultLang]);

    const groups = useMemo(() => {
        const set = new Set<string>();
        for (const k of keys) set.add(k.group);
        return Array.from(set).sort();
    }, [keys]);

    const reload = () => router.reload({ only: ['languages', 'values', 'keys'] });

    return (
        <AdminLayout>
            <Head title="Localization" />
            <div className="space-y-6">
                <PageHeader
                    title="Localization"
                    description="Manage supported languages and translate user-facing text."
                    actions={
                        <>
                            <button
                                onClick={() => setShowAiTranslate(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all"
                            >
                                <Sparkles size={15} /> Auto translate with AI
                            </button>
                            <button
                                onClick={() => setShowExport(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low transition-all"
                            >
                                <Download size={15} /> Export
                            </button>
                            <button
                                onClick={() => setShowImport(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low transition-all"
                            >
                                <Upload size={15} /> Import
                            </button>
                        </>
                    }
                />

                <SyncInfoBanner />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Keys"
                        value={keys.length}
                        hint="Across all groups"
                    />
                    <StatCard
                        label="Active Languages"
                        value={languages.filter((l) => l.is_active).length}
                        hint={`${languages.length} total`}
                    />
                    <StatCard
                        label="Default Language"
                        value={defaultLang?.name ?? '—'}
                        hint={defaultLang?.native_name ?? ''}
                    />
                    <StatCard
                        label="Last Sync"
                        value={last_sync_at ?? 'Never'}
                        hint="From user panel"
                    />
                </div>

                <TwoColumnLayout
                    aside={
                        <NavPanel
                            label="Languages"
                            action={
                                <button
                                    onClick={() => setShowAddLanguage(true)}
                                    className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80"
                                >
                                    <Plus size={13} /> Add
                                </button>
                            }
                        >
                            {languages.map((lang, index) => (
                                <div key={lang.code}>
                                    <LanguageNavItem
                                        language={lang}
                                        isActive={lang.code === activeCode}
                                        onSelect={() => setActiveCode(lang.code)}
                                    />
                                    {lang.is_default && index === 0 && languages.length > 1 && (
                                        <div className="my-2 mx-3 border-t border-surface-container" />
                                    )}
                                </div>
                            ))}
                        </NavPanel>
                    }
                >
                    {activeLanguage ? (
                        <LanguageEditor
                            language={activeLanguage}
                            languages={languages}
                            keys={keys}
                            values={values}
                            groups={groups}
                            onAddKey={() => setShowAddKey(true)}
                            onReload={reload}
                        />
                    ) : (
                        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center text-sm text-on-surface-variant">
                            Select a language to translate.
                        </div>
                    )}
                </TwoColumnLayout>
            </div>

            {showAddLanguage && (
                <AddLanguageModal onClose={() => setShowAddLanguage(false)} />
            )}
            {showAddKey && <AddKeyModal onClose={() => setShowAddKey(false)} />}
            {showExport && (
                <ExportTranslationsModal
                    languages={languages}
                    onClose={() => setShowExport(false)}
                />
            )}
            {showImport && (
                <ImportTranslationsModal
                    onClose={() => setShowImport(false)}
                    onImported={reload}
                />
            )}
            {showAiTranslate && (
                <AiTranslateModal
                    onClose={() => setShowAiTranslate(false)}
                    onFinished={reload}
                />
            )}
        </AdminLayout>
    );
}

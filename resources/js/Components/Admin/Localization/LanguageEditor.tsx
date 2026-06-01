import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { router } from '@inertiajs/react';
import LanguageHeaderCard from './LanguageHeaderCard';
import EditorToolbar, { TranslatedFilter } from './EditorToolbar';
import TranslationRow from './TranslationRow';
import MasterTranslationRow from './MasterTranslationRow';
import EditLanguageModal from './EditLanguageModal';
import type { FlattenedTranslation, Language, TranslationKey, ValuesMap } from './types';

interface Props {
    language: Language;
    languages: Language[];
    keys: TranslationKey[];
    values: ValuesMap;
    groups: string[];
    onAddKey: () => void;
    onReload: () => void;
}

export default function LanguageEditor({
    language,
    languages,
    keys,
    values,
    groups,
    onAddKey,
    onReload,
}: Props) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<TranslatedFilter>('all');
    const [groupFilter, setGroupFilter] = useState<string>('all');
    const [showEdit, setShowEdit] = useState(false);

    const isMaster = language.is_default;

    const nonDefaultActiveLanguages = useMemo(
        () => languages.filter((l) => !l.is_default && l.is_active),
        [languages],
    );

    const activeTranslations: FlattenedTranslation[] = useMemo(() => {
        return keys.map((k) => {
            const v = language.is_default
                ? k.source
                : values[language.code]?.[k.key]?.value ?? '';
            const updated = language.is_default
                ? k.updated_at
                : values[language.code]?.[k.key]?.updated_at ?? null;
            return {
                id: k.id,
                group: k.group,
                key: k.key,
                source: k.source,
                translation: v,
                placeholders: k.placeholders,
                updated_at: updated,
            };
        });
    }, [keys, values, language]);

    const filteredTranslations = useMemo(() => {
        return activeTranslations.filter((t) => {
            if (groupFilter !== 'all' && t.group !== groupFilter) return false;
            if (filter === 'translated' && !t.translation) return false;
            if (filter === 'missing' && t.translation) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    t.key.toLowerCase().includes(q) ||
                    t.source.toLowerCase().includes(q) ||
                    t.translation.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [activeTranslations, filter, search, groupFilter]);

    const groupedTranslations = useMemo(() => {
        const map: Record<string, FlattenedTranslation[]> = {};
        for (const t of filteredTranslations) {
            if (!map[t.group]) map[t.group] = [];
            map[t.group].push(t);
        }
        return map;
    }, [filteredTranslations]);

    const toggleActive = (isActive: boolean) => {
        router.patch(
            `/admin/settings/localization/languages/${language.code}`,
            { is_active: isActive },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => onReload(),
            },
        );
    };

    const remove = () => {
        if (!confirm('Remove this language and all its translations?')) return;
        router.delete(`/admin/settings/localization/languages/${language.code}`, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    return (
        <motion.div
            key={language.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
        >
            <LanguageHeaderCard
                language={language}
                isMaster={isMaster}
                totalKeys={keys.length}
                activeTargetCount={nonDefaultActiveLanguages.length}
                groupCount={groups.length}
                onToggleActive={toggleActive}
                onEdit={() => setShowEdit(true)}
                onRemove={remove}
            />

            <EditorToolbar
                search={search}
                onSearchChange={setSearch}
                groupFilter={groupFilter}
                onGroupChange={setGroupFilter}
                groups={groups}
                filter={filter}
                onFilterChange={setFilter}
                showTranslatedFilter={!isMaster}
                onAddKey={onAddKey}
            />

            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
                {Object.keys(groupedTranslations).length === 0 ? (
                    <div className="p-12 text-center text-sm text-on-surface-variant">
                        {keys.length === 0 ? (
                            <>
                                No translation keys yet. Run{' '}
                                <code className="font-mono font-bold bg-surface-container-low px-1.5 py-0.5 rounded">
                                    php artisan locale:sync
                                </code>{' '}
                                or click <em>Add Key</em> to get started.
                            </>
                        ) : (
                            'No translations match your filter.'
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-surface-container">
                        {Object.entries(groupedTranslations).map(([group, items]) => (
                            <div key={group}>
                                <div className="px-5 py-2.5 bg-surface-container-low/50 border-b border-surface-container">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        {group}
                                    </span>
                                    <span className="ml-2 text-[10px] text-on-surface-variant">
                                        ({items.length})
                                    </span>
                                </div>
                                <div className="divide-y divide-surface-container">
                                    {items.map((t) =>
                                        isMaster ? (
                                            <MasterTranslationRow
                                                key={t.id}
                                                translation={t}
                                                languages={nonDefaultActiveLanguages}
                                                values={values}
                                                onSaved={onReload}
                                            />
                                        ) : (
                                            <TranslationRow
                                                key={`${language.code}-${t.id}`}
                                                translation={t}
                                                direction={language.direction}
                                                languageCode={language.code}
                                                onSaved={onReload}
                                            />
                                        ),
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showEdit && (
                <EditLanguageModal
                    language={language}
                    onClose={() => {
                        setShowEdit(false);
                        onReload();
                    }}
                />
            )}
        </motion.div>
    );
}

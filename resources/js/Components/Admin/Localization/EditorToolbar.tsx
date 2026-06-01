import { ChevronDown, Filter, Plus, Search } from 'lucide-react';

export type TranslatedFilter = 'all' | 'translated' | 'missing';

interface Props {
    search: string;
    onSearchChange: (v: string) => void;
    groupFilter: string;
    onGroupChange: (v: string) => void;
    groups: string[];
    filter: TranslatedFilter;
    onFilterChange: (v: TranslatedFilter) => void;
    showTranslatedFilter: boolean;
    onAddKey: () => void;
}

export default function EditorToolbar({
    search,
    onSearchChange,
    groupFilter,
    onGroupChange,
    groups,
    filter,
    onFilterChange,
    showTranslatedFilter,
    onAddKey,
}: Props) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
                <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search keys, source, or translation..."
                    className="w-full bg-surface-container-low border border-surface-container rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                />
            </div>

            <div className="relative">
                <Filter
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <select
                    value={groupFilter}
                    onChange={(e) => onGroupChange(e.target.value)}
                    className="appearance-none bg-surface-container-low border border-surface-container rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary/30 capitalize"
                >
                    <option value="all">All Groups</option>
                    {groups.map((g) => (
                        <option key={g} value={g}>
                            {g}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
            </div>

            {showTranslatedFilter && (
                <div className="flex rounded-xl border border-surface-container bg-surface-container-low p-1">
                    {(['all', 'translated', 'missing'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => onFilterChange(f)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                                filter === f
                                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={onAddKey}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/15 transition-colors ml-auto"
            >
                <Plus size={14} /> Add Key
            </button>
        </div>
    );
}

import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';

import { NavPanel } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import type { CategoryRow } from './types';

interface Props {
    categories: CategoryRow[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onCreate: () => void;
    onEdit: (cat: CategoryRow) => void;
    onDelete: (cat: CategoryRow) => void;
}

export default function CategoriesPanel({
    categories,
    selectedId,
    onSelect,
    onCreate,
    onEdit,
    onDelete,
}: Props) {
    const t = useT();

    return (
        <NavPanel
            label={t('admin.support.categories_label', 'Categories')}
            action={
                <button
                    type="button"
                    onClick={onCreate}
                    title={t('admin.support.new_category', 'New category')}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                >
                    <Plus size={14} />
                </button>
            }
        >
            {categories.length === 0 ? (
                <div className="px-3 py-8 text-center">
                    <FolderTree
                        size={28}
                        className="text-surface-container mx-auto mb-2"
                    />
                    <p className="text-xs text-on-surface-variant">
                        {t(
                            'admin.support.no_categories',
                            'No categories yet. Create your first one.',
                        )}
                    </p>
                </div>
            ) : (
                categories.map((c) => (
                    <CategoryNavItem
                        key={c.id}
                        category={c}
                        isActive={c.id === selectedId}
                        onSelect={() => onSelect(c.id)}
                        onEdit={() => onEdit(c)}
                        onDelete={() => onDelete(c)}
                    />
                ))
            )}
        </NavPanel>
    );
}

interface CategoryNavItemProps {
    category: CategoryRow;
    isActive: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function CategoryNavItem({
    category,
    isActive,
    onSelect,
    onEdit,
    onDelete,
}: CategoryNavItemProps) {
    const t = useT();

    return (
        <div
            className={`group flex items-center gap-2 rounded-xl border transition-colors ${
                isActive
                    ? 'bg-primary/10 border-primary/15'
                    : 'bg-transparent border-transparent hover:bg-surface-container-low'
            }`}
        >
            <button
                onClick={onSelect}
                className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left"
            >
                <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                        isActive
                            ? 'bg-primary text-white'
                            : 'bg-surface-container text-on-surface-variant group-hover:text-primary'
                    }`}
                >
                    <FolderTree size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p
                            className={`text-sm font-bold truncate ${
                                isActive ? 'text-primary' : 'text-on-surface'
                            }`}
                        >
                            {category.name}
                        </p>
                        {!category.is_active && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container px-1.5 py-0.5 rounded-full text-on-surface-variant flex-shrink-0">
                                {t('admin.support.off', 'Off')}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-on-surface-variant truncate">
                        {category.slug} · {category.faqs_count}{' '}
                        {t('admin.support.faqs_short', 'FAQs')}
                    </p>
                </div>
            </button>
            <div className="flex items-center pr-2 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconButton
                    label={t('admin.support.edit', 'Edit')}
                    onClick={onEdit}
                    icon={<Pencil size={13} />}
                />
                <IconButton
                    label={t('admin.support.delete', 'Delete')}
                    onClick={onDelete}
                    icon={<Trash2 size={13} />}
                    tone="danger"
                />
            </div>
        </div>
    );
}

function IconButton({
    label,
    icon,
    onClick,
    tone = 'neutral',
}: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    tone?: 'neutral' | 'danger';
}) {
    const toneClass =
        tone === 'danger'
            ? 'text-on-surface-variant hover:text-red-500 hover:bg-red-500/10'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container';

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`p-1.5 rounded-lg transition-colors ${toneClass}`}
        >
            {icon}
        </button>
    );
}

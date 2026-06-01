import { LifeBuoy, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';

import { useT } from '@/lib/i18n';

import type { CategoryRow, FaqRow } from './types';

interface Props {
    category: CategoryRow | null;
    onAddFaq: () => void;
    onEditFaq: (faq: FaqRow) => void;
    onDeleteFaq: (faq: FaqRow) => void;
}

export default function FaqsPanel({
    category,
    onAddFaq,
    onEditFaq,
    onDeleteFaq,
}: Props) {
    const t = useT();

    if (category === null) {
        return (
            <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-10 text-center">
                <LifeBuoy size={48} className="text-surface-container mx-auto mb-4" />
                <p className="text-sm text-on-surface-variant">
                    {t(
                        'admin.support.select_category',
                        'Select a category to manage its FAQs.',
                    )}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-2xl">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-surface-container">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {t('admin.support.faqs_in', 'FAQs in')}
                    </p>
                    <h3 className="font-headline font-extrabold text-on-surface text-lg truncate">
                        {category.name}
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={onAddFaq}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:brightness-110 transition-all flex-shrink-0"
                >
                    <Plus size={13} />
                    {t('admin.support.new_faq', 'New FAQ')}
                </button>
            </div>

            {category.faqs.length === 0 ? (
                <div className="p-10 text-center">
                    <MessageSquare
                        size={32}
                        className="text-surface-container mx-auto mb-2"
                    />
                    <p className="text-sm text-on-surface-variant">
                        {t(
                            'admin.support.no_faqs',
                            'No FAQs in this category yet.',
                        )}
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-surface-container">
                    {category.faqs.map((faq) => (
                        <FaqRowItem
                            key={faq.id}
                            faq={faq}
                            onEdit={() => onEditFaq(faq)}
                            onDelete={() => onDeleteFaq(faq)}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function FaqRowItem({
    faq,
    onEdit,
    onDelete,
}: {
    faq: FaqRow;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const t = useT();
    return (
        <li className="group p-4 hover:bg-surface-container-low/40 transition-colors">
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-on-surface truncate">
                            {faq.question}
                        </p>
                        {!faq.is_active && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container px-1.5 py-0.5 rounded-full text-on-surface-variant flex-shrink-0">
                                {t('admin.support.off', 'Off')}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                        {faq.answer}
                    </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
        </li>
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

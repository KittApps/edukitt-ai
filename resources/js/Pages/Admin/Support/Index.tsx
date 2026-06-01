import { Head, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
    CategoriesPanel,
    CategoryEditorModal,
    ConfirmDeleteModal,
    FaqEditorModal,
    FaqsPanel,
    SupportStatsRow,
    type CategoryEditorState,
    type CategoryRow,
    type FaqEditorState,
    type FaqRow,
    type SupportStats,
} from '@/Components/Admin/Support';
import { PageHeader, TwoColumnLayout } from '@/Components/Admin/Shared';
import AdminLayout from '@/Layouts/AdminLayout';
import { useT } from '@/lib/i18n';
import type { PageProps } from '@/types';

interface Props {
    categories: CategoryRow[];
    stats: SupportStats;
}

interface FlashShape {
    success?: string | null;
    error?: string | null;
}

export default function SupportIndex({ categories, stats }: Props) {
    const t = useT();
    const [selectedId, setSelectedId] = useState<number | null>(
        categories[0]?.id ?? null,
    );
    const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState>(null);
    const [faqEditor, setFaqEditor] = useState<FaqEditorState>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<CategoryRow | null>(
        null,
    );
    const [faqToDelete, setFaqToDelete] = useState<FaqRow | null>(null);

    useEffect(() => {
        if (categories.length === 0) {
            setSelectedId(null);
            return;
        }
        if (!categories.find((c) => c.id === selectedId)) {
            setSelectedId(categories[0].id);
        }
    }, [categories, selectedId]);

    const selectedCategory = useMemo(
        () => categories.find((c) => c.id === selectedId) ?? null,
        [categories, selectedId],
    );

    return (
        <AdminLayout>
            <Head title={t('admin.support.title', 'Support')} />

            <div className="space-y-6">
                <PageHeader
                    title={t('admin.support.heading', 'Support')}
                    description={t(
                        'admin.support.subheading',
                        'Manage help center categories and FAQs.',
                    )}
                />

                <FlashBanner />

                <SupportStatsRow stats={stats} />

                <TwoColumnLayout
                    aside={
                        <CategoriesPanel
                            categories={categories}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onCreate={() => setCategoryEditor('new')}
                            onEdit={(c) => setCategoryEditor(c)}
                            onDelete={(c) => setCategoryToDelete(c)}
                        />
                    }
                >
                    <FaqsPanel
                        category={selectedCategory}
                        onAddFaq={() => setFaqEditor('new')}
                        onEditFaq={(f) => setFaqEditor(f)}
                        onDeleteFaq={(f) => setFaqToDelete(f)}
                    />
                </TwoColumnLayout>
            </div>

            {categoryEditor !== null && (
                <CategoryEditorModal
                    initial={categoryEditor === 'new' ? null : categoryEditor}
                    onClose={() => setCategoryEditor(null)}
                />
            )}

            {faqEditor !== null && selectedCategory && (
                <FaqEditorModal
                    categoryId={selectedCategory.id}
                    initial={faqEditor === 'new' ? null : faqEditor}
                    categories={categories}
                    onClose={() => setFaqEditor(null)}
                />
            )}

            {categoryToDelete && (
                <ConfirmDeleteModal
                    title={t('admin.support.delete_category', 'Delete category')}
                    description={t(
                        'admin.support.delete_category_desc',
                        'This will permanently delete the category and all its FAQs.',
                    )}
                    url={`/admin/support/categories/${categoryToDelete.id}`}
                    onClose={() => setCategoryToDelete(null)}
                />
            )}

            {faqToDelete && (
                <ConfirmDeleteModal
                    title={t('admin.support.delete_faq', 'Delete FAQ')}
                    description={t(
                        'admin.support.delete_faq_desc',
                        'This will permanently delete this FAQ.',
                    )}
                    url={`/admin/support/faqs/${faqToDelete.id}`}
                    onClose={() => setFaqToDelete(null)}
                />
            )}
        </AdminLayout>
    );
}

function FlashBanner() {
    const { props } = usePage<PageProps<{ flash?: FlashShape }>>();
    const flash = props.flash ?? {};
    if (!flash.success && !flash.error) {
        return null;
    }
    if (flash.error) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="min-w-0 break-words">{flash.error}</p>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            <p className="min-w-0 break-words">{flash.success}</p>
        </div>
    );
}

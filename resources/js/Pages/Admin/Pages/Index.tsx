import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/Components/Admin/Shared';
import {
    PagesStatsRow,
    PagesTable,
    type PageRow,
    type PagesStats,
} from '@/Components/Admin/Pages';
import AdminLayout from '@/Layouts/AdminLayout';
import { useT } from '@/lib/i18n';
import type { PageProps } from '@/types';

interface Props {
    pages: PageRow[];
    stats: PagesStats;
}

interface FlashShape {
    success?: string | null;
    error?: string | null;
}

export default function PagesIndex({ pages, stats }: Props) {
    const t = useT();
    const [pageToDelete, setPageToDelete] = useState<PageRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleConfirmDelete = () => {
        if (!pageToDelete) return;
        setDeleting(true);
        router.delete(`/admin/pages/${pageToDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setPageToDelete(null);
            },
        });
    };

    return (
        <AdminLayout>
            <Head title={t('admin.pages.title', 'Pages')} />

            <div className="space-y-6">
                <PageHeader
                    title={t('admin.pages.heading', 'Pages')}
                    description={t(
                        'admin.pages.subheading',
                        'Manage public pages such as Terms, Privacy and other static content.',
                    )}
                    actions={
                        <Link
                            href="/admin/pages/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all"
                        >
                            <Plus size={14} />
                            {t('admin.pages.new', 'New page')}
                        </Link>
                    }
                />

                <FlashBanner />

                <PagesStatsRow stats={stats} />

                <PagesTable pages={pages} onDelete={setPageToDelete} />
            </div>

            {pageToDelete && (
                <DeleteModal
                    page={pageToDelete}
                    pending={deleting}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setPageToDelete(null)}
                />
            )}
        </AdminLayout>
    );
}

function FlashBanner() {
    const { props } = usePage<PageProps<{ flash?: FlashShape }>>();
    const flash = props.flash ?? {};
    if (!flash.success && !flash.error) return null;

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

function DeleteModal({
    page,
    pending,
    onConfirm,
    onClose,
}: {
    page: PageRow;
    pending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const t = useT();
    return (
        <div
            className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface-container-lowest rounded-3xl border border-surface-container max-w-md w-full p-7 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-headline font-extrabold text-on-surface mb-2">
                    {t('admin.pages.delete_title', 'Delete page')}
                </h3>
                <p className="text-sm text-on-surface-variant">
                    {t(
                        'admin.pages.delete_desc',
                        'This will permanently delete "{title}". This action cannot be undone.',
                        { title: page.title },
                    )}
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container"
                    >
                        {t('admin.pages.cancel', 'Cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={pending}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:brightness-110 disabled:opacity-50"
                    >
                        {pending
                            ? t('admin.pages.deleting', 'Deleting…')
                            : t('admin.pages.delete', 'Delete')}
                    </button>
                </div>
            </div>
        </div>
    );
}

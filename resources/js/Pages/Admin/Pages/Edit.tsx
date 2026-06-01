import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

import { PageHeader } from '@/Components/Admin/Shared';
import { PageForm, type PageRow } from '@/Components/Admin/Pages';
import AdminLayout from '@/Layouts/AdminLayout';
import { useT } from '@/lib/i18n';
import type { PageProps } from '@/types';

interface Props {
    page: PageRow;
}

interface FlashShape {
    success?: string | null;
    error?: string | null;
}

export default function PageEdit({ page }: Props) {
    const t = useT();
    return (
        <AdminLayout>
            <Head title={t('admin.pages.edit_title', 'Edit page')} />

            <div className="space-y-6">
                <BackLink />

                <PageHeader
                    title={page.title}
                    description={t(
                        'admin.pages.edit_subheading',
                        'Update content, SEO meta and publish state.',
                    )}
                />

                <FlashBanner />

                <PageForm initial={page} />
            </div>
        </AdminLayout>
    );
}

function BackLink() {
    const t = useT();
    return (
        <Link
            href="/admin/pages"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
        >
            <ArrowLeft size={12} />
            {t('admin.pages.back', 'Back to pages')}
        </Link>
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

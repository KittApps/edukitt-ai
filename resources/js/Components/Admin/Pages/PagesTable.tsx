import { Link } from '@inertiajs/react';
import {
    ExternalLink,
    FileText,
    Lock,
    PanelBottom,
    Pencil,
    Trash2,
} from 'lucide-react';

import { useT } from '@/lib/i18n';

import type { PageRow } from './types';

interface Props {
    pages: PageRow[];
    onDelete: (page: PageRow) => void;
}

export default function PagesTable({ pages, onDelete }: Props) {
    const t = useT();

    if (pages.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-12 text-center">
                <FileText size={36} className="text-surface-container mx-auto mb-3" />
                <p className="text-sm text-on-surface-variant">
                    {t(
                        'admin.pages.empty',
                        'No pages yet. Create your first one.',
                    )}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-surface-container-low/40 border-b border-surface-container">
                        <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            <Th>{t('admin.pages.table.title', 'Title')}</Th>
                            <Th>{t('admin.pages.table.slug', 'Slug')}</Th>
                            <Th>{t('admin.pages.table.status', 'Status')}</Th>
                            <Th>{t('admin.pages.table.updated', 'Updated')}</Th>
                            <Th className="text-right">
                                {t('admin.pages.table.actions', 'Actions')}
                            </Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {pages.map((p) => (
                            <PageRowItem
                                key={p.id}
                                page={p}
                                onDelete={() => onDelete(p)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PageRowItem({
    page,
    onDelete,
}: {
    page: PageRow;
    onDelete: () => void;
}) {
    const t = useT();
    return (
        <tr className="hover:bg-surface-container-low/40 transition-colors">
            <Td>
                <div className="flex items-center gap-2 min-w-0">
                    <p className="font-bold text-on-surface truncate">{page.title}</p>
                    {page.is_system && (
                        <span
                            title={t(
                                'admin.pages.system_hint',
                                'System page — slug locked, cannot be deleted',
                            )}
                            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-surface-container px-1.5 py-0.5 rounded-full text-on-surface-variant flex-shrink-0"
                        >
                            <Lock size={9} /> {t('admin.pages.system', 'System')}
                        </span>
                    )}
                </div>
            </Td>
            <Td>
                <code className="text-xs text-on-surface-variant font-mono">
                    /pages/{page.slug}
                </code>
            </Td>
            <Td>
                <div className="inline-flex items-center gap-1.5">
                    <StatusBadge published={page.is_published} />
                    {page.show_in_footer && page.is_published && <FooterBadge />}
                </div>
            </Td>
            <Td>
                <span className="text-xs text-on-surface-variant">
                    {formatDate(page.updated_at)}
                </span>
            </Td>
            <Td className="text-right">
                <div className="inline-flex items-center gap-0.5">
                    <a
                        href={page.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('admin.pages.view', 'View public page')}
                        aria-label={t('admin.pages.view', 'View public page')}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                        <ExternalLink size={14} />
                    </a>
                    <Link
                        href={`/admin/pages/${page.id}/edit`}
                        title={t('admin.pages.edit', 'Edit')}
                        aria-label={t('admin.pages.edit', 'Edit')}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                    >
                        <Pencil size={14} />
                    </Link>
                    {!page.is_system && (
                        <button
                            type="button"
                            onClick={onDelete}
                            title={t('admin.pages.delete', 'Delete')}
                            aria-label={t('admin.pages.delete', 'Delete')}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </Td>
        </tr>
    );
}

function FooterBadge() {
    const t = useT();
    return (
        <span
            title={t(
                'admin.pages.footer_hint',
                'Shown in the public footer Resources column',
            )}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full"
        >
            <PanelBottom size={10} />
            {t('admin.pages.in_footer', 'Footer')}
        </span>
    );
}

function StatusBadge({ published }: { published: boolean }) {
    const t = useT();
    if (published) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('admin.pages.status.published', 'Published')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50" />
            {t('admin.pages.status.draft', 'Draft')}
        </span>
    );
}

function Th({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <th className={`px-4 py-2.5 ${className}`}>{children}</th>;
}

function Td({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

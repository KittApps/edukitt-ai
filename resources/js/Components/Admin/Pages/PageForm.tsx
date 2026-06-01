import { Link, useForm } from '@inertiajs/react';
import { ExternalLink, Lock, Save } from 'lucide-react';
import { useState } from 'react';

import { useT } from '@/lib/i18n';

import RichTextEditor from './RichTextEditor';
import type { PageRow } from './types';

interface Props {
    initial: PageRow | null;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

export default function PageForm({ initial }: Props) {
    const t = useT();
    const isEdit = initial !== null;
    const slugLocked = !!initial?.is_system;
    const [slugTouched, setSlugTouched] = useState(isEdit);

    const form = useForm({
        title: initial?.title ?? '',
        slug: initial?.slug ?? '',
        meta_description: initial?.meta_description ?? '',
        content: initial?.content ?? '',
        is_published: initial?.is_published ?? true,
        show_in_footer: initial?.show_in_footer ?? false,
    });

    const handleTitle = (next: string) => {
        form.setData('title', next);
        if (!slugTouched && !slugLocked) {
            form.setData('slug', slugify(next));
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true };
        if (isEdit) {
            form.put(`/admin/pages/${initial!.id}`, opts);
        } else {
            form.post('/admin/pages', opts);
        }
    };

    return (
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
                <SectionCard
                    title={t('admin.pages.section.content', 'Content')}
                    description={t(
                        'admin.pages.section.content_hint',
                        'Headings, lists, links and quotes are supported.',
                    )}
                >
                    <Field label={t('admin.pages.field.title', 'Title')}>
                        <input
                            className={fieldClasses}
                            value={form.data.title}
                            onChange={(e) => handleTitle(e.target.value)}
                            placeholder={t(
                                'admin.pages.field.title_placeholder',
                                'Terms of Service',
                            )}
                        />
                        {form.errors.title && (
                            <p className="text-xs text-red-500 mt-1">
                                {form.errors.title}
                            </p>
                        )}
                    </Field>

                    <Field label={t('admin.pages.field.body', 'Body')}>
                        <RichTextEditor
                            value={form.data.content}
                            onChange={(html) => form.setData('content', html)}
                            placeholder={t(
                                'admin.pages.field.body_placeholder',
                                'Write your page content…',
                            )}
                            error={form.errors.content}
                        />
                    </Field>
                </SectionCard>
            </div>

            <aside className="lg:col-span-1 space-y-4">
                <SectionCard title={t('admin.pages.section.publish', 'Publish')}>
                    <label className="flex items-start gap-3 p-3 bg-surface-container-low/40 rounded-xl cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.data.is_published}
                            onChange={(e) =>
                                form.setData('is_published', e.target.checked)
                            }
                            className="mt-0.5"
                        />
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-on-surface">
                                {t('admin.pages.field.published', 'Published')}
                            </span>
                            <span className="block text-xs text-on-surface-variant mt-0.5">
                                {t(
                                    'admin.pages.field.published_hint',
                                    'Visible to anyone with the link when on.',
                                )}
                            </span>
                        </span>
                    </label>

                    <label
                        className={`flex items-start gap-3 p-3 rounded-xl ${
                            form.data.is_published
                                ? 'bg-surface-container-low/40 cursor-pointer'
                                : 'bg-surface-container-low/20 opacity-60 cursor-not-allowed'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={form.data.show_in_footer}
                            disabled={!form.data.is_published}
                            onChange={(e) =>
                                form.setData('show_in_footer', e.target.checked)
                            }
                            className="mt-0.5"
                        />
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-on-surface">
                                {t(
                                    'admin.pages.field.show_in_footer',
                                    'Show in footer — Resources',
                                )}
                            </span>
                        </span>
                    </label>

                    <div className="flex flex-col gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {form.processing
                                ? t('admin.pages.saving', 'Saving…')
                                : isEdit
                                  ? t('admin.pages.save_changes', 'Save changes')
                                  : t('admin.pages.create', 'Create page')}
                        </button>
                        <Link
                            href="/admin/pages"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container"
                        >
                            {t('admin.pages.cancel', 'Cancel')}
                        </Link>
                    </div>
                </SectionCard>

                <SectionCard title={t('admin.pages.section.url', 'URL & SEO')}>
                    <Field label={t('admin.pages.field.slug', 'Slug')}>
                        <div className="flex items-stretch rounded-xl border border-surface-container bg-surface-container-low/50 overflow-hidden">
                            <span className="px-3 flex items-center text-xs text-on-surface-variant font-mono bg-surface-container/60 border-r border-surface-container">
                                /pages/
                            </span>
                            <input
                                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none font-mono"
                                value={form.data.slug}
                                disabled={slugLocked}
                                onChange={(e) => {
                                    setSlugTouched(true);
                                    form.setData('slug', e.target.value);
                                }}
                                placeholder="terms"
                            />
                            {slugLocked && (
                                <span
                                    className="px-3 flex items-center text-on-surface-variant"
                                    title={t(
                                        'admin.pages.slug_locked',
                                        'System pages have a locked slug.',
                                    )}
                                >
                                    <Lock size={12} />
                                </span>
                            )}
                        </div>
                        {form.errors.slug && (
                            <p className="text-xs text-red-500 mt-1">
                                {form.errors.slug}
                            </p>
                        )}
                        {isEdit && initial?.public_url && (
                            <a
                                href={initial.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                            >
                                <ExternalLink size={11} />{' '}
                                {t('admin.pages.view_public', 'View public page')}
                            </a>
                        )}
                    </Field>

                    <Field
                        label={t(
                            'admin.pages.field.meta_description',
                            'Meta description',
                        )}
                    >
                        <textarea
                            className={`${fieldClasses} min-h-24 resize-y`}
                            value={form.data.meta_description}
                            onChange={(e) =>
                                form.setData('meta_description', e.target.value)
                            }
                            placeholder={t(
                                'admin.pages.field.meta_description_placeholder',
                                'A short summary shown in search results and link previews.',
                            )}
                            maxLength={500}
                        />
                        <p className="text-[10px] text-on-surface-variant mt-1">
                            {form.data.meta_description?.length ?? 0} / 500
                        </p>
                    </Field>
                </SectionCard>
            </aside>
        </form>
    );
}

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-5 space-y-4">
            <div>
                <h3 className="text-sm font-headline font-extrabold text-on-surface">
                    {title}
                </h3>
                {description && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                {label}
            </label>
            {children}
        </div>
    );
}

const fieldClasses =
    'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

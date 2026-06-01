import { Head } from '@inertiajs/react';

import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';

interface PublicPage {
    slug: string;
    title: string;
    meta_description: string | null;
    content: string;
    updated_at: string | null;
}

interface Props {
    page: PublicPage;
}

export default function PublicPageView({ page }: Props) {
    const t = useT();
    return (
        <PublicLayout>
            <Head>
                <title>{page.title}</title>
                {page.meta_description && (
                    <meta name="description" content={page.meta_description} />
                )}
            </Head>

            <article className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24">
                <header className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight">
                        {page.title}
                    </h1>
                    {page.updated_at && (
                        <p className="text-xs text-on-surface-variant mt-3">
                            {t('public.page.updated', 'Last updated {date}', {
                                date: formatDate(page.updated_at),
                            })}
                        </p>
                    )}
                </header>

                <div
                    className="public-page-content text-on-surface"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </article>

            <PublicPageStyles />
        </PublicLayout>
    );
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return iso;
    }
}

function PublicPageStyles() {
    return (
        <style>{`
            .public-page-content { font-size: 1rem; line-height: 1.7; }
            .public-page-content p { margin: 0 0 1em; }
            .public-page-content h2 {
                font-size: 1.5rem; font-weight: 800;
                margin: 2em 0 0.6em; line-height: 1.25;
                font-family: var(--font-headline, inherit);
            }
            .public-page-content h3 {
                font-size: 1.2rem; font-weight: 700;
                margin: 1.6em 0 0.5em; line-height: 1.3;
            }
            .public-page-content ul,
            .public-page-content ol { padding-left: 1.4rem; margin: 0 0 1em; }
            .public-page-content ul { list-style: disc; }
            .public-page-content ol { list-style: decimal; }
            .public-page-content li { margin: 0.3em 0; }
            .public-page-content a {
                color: var(--color-primary, #6366f1);
                text-decoration: underline;
                text-underline-offset: 2px;
            }
            .public-page-content blockquote {
                border-left: 3px solid var(--color-primary, #6366f1);
                padding-left: 1rem;
                color: var(--color-on-surface-variant, #6b7280);
                font-style: italic;
                margin: 0 0 1em;
            }
            .public-page-content code {
                background: rgba(99, 102, 241, 0.1);
                padding: 0.1em 0.4em;
                border-radius: 0.35rem;
                font-size: 0.9em;
            }
            .public-page-content hr {
                border: 0;
                border-top: 1px solid var(--color-surface-container, #e5e7eb);
                margin: 2em 0;
            }
        `}</style>
    );
}

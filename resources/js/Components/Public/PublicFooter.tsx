import { Link, usePage } from '@inertiajs/react';
import { useT } from '@/lib/i18n';
import BrandMark from '@/Components/Shared/BrandMark';
import { useBrand } from '@/lib/settings';

interface FooterLink {
    label: string;
    href: string;
    external?: boolean;
}

interface SharedFooterPage {
    slug: string;
    title: string;
}

interface SharedFooterContext {
    pages: SharedFooterPage[];
    legal: { terms: boolean; privacy: boolean };
}

export default function PublicFooter() {
    const t = useT();
    const year = new Date().getFullYear();
    const { props } = usePage();
    const footerCtx =
        (props as { footer?: SharedFooterContext | null }).footer ?? {
            pages: [],
            legal: { terms: false, privacy: false },
        };

    const productLinks: FooterLink[] = [
        { label: t('public.footer.product.features', 'Features'), href: '/#features' },
        { label: t('public.footer.product.how_it_works', 'How it works'), href: '/#how-it-works' },
        { label: t('public.footer.product.pricing', 'Pricing'), href: '/pricing' },
    ];

    const accountLinks: FooterLink[] = [
        { label: t('public.footer.account.sign_in', 'Sign in'), href: '/login' },
        { label: t('public.footer.account.register', 'Create account'), href: '/register' },
    ];

    const brand = useBrand();

    // Dynamic "Resources" group: Help & Support (when enabled in
    // admin general settings) pinned at the top, followed by
    // admin-managed pages that opted into the footer via the
    // "Show in footer" toggle. Column is suppressed when empty.
    // Admin-managed page links carry their DB title as the label —
    // they are not part of the static translation manifest.
    const resourceLinks: FooterLink[] = [
        ...(brand.support_enabled
            ? [
                  {
                      label: t('public.footer.resources.support', 'Help & Support'),
                      href: '/support',
                  } satisfies FooterLink,
              ]
            : []),
        ...footerCtx.pages.map((p) => ({
            label: p.title,
            href: `/pages/${p.slug}`,
        })),
    ];

    const legalLinks: FooterLink[] = [
        footerCtx.legal.terms && {
            label: t('public.footer.legal.terms', 'Terms'),
            href: '/pages/terms',
        },
        footerCtx.legal.privacy && {
            label: t('public.footer.legal.privacy', 'Privacy'),
            href: '/pages/privacy',
        },
    ].filter((link): link is FooterLink => Boolean(link));

    const showResources = resourceLinks.length > 0;
    const columnsClass = showResources
        ? 'md:grid-cols-4'
        : 'md:grid-cols-3';

    return (
        <footer className="border-t border-surface-container bg-surface-container-low/40">
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
                <div className={`grid grid-cols-1 ${columnsClass} gap-10 md:gap-8`}>
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center">
                            <BrandMark height={36} alt={t('public.footer.brand_alt', 'EduKitt')} />
                        </Link>
                        <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
                            {t(
                                'public.footer.tagline',
                                'AI-powered learning that adapts to how you want to learn — courses, quick learns, and quizzes on any topic.',
                            )}
                        </p>
                    </div>

                    <FooterColumn
                        title={t('public.footer.product.title', 'Product')}
                        links={productLinks}
                    />

                    <FooterColumn
                        title={t('public.footer.account.title', 'Account')}
                        links={accountLinks}
                    />

                    {showResources && (
                        <FooterColumn
                            title={t('public.footer.resources.title', 'Resources')}
                            links={resourceLinks}
                        />
                    )}
                </div>

                <div className="mt-12 pt-6 border-t border-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-xs text-on-surface-variant font-medium">
                        {t('public.footer.copyright', '© {year} EduKitt. All rights reserved.', {
                            year,
                        })}
                    </p>
                    {legalLinks.length > 0 && (
                        <ul className="flex items-center gap-5">
                            {legalLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
    return (
        <div>
            <h4 className="text-[11px] font-black text-on-surface uppercase tracking-[0.18em] mb-4">
                {title}
            </h4>
            <ul className="space-y-2.5">
                {links.map((link) => {
                    const isAnchor = link.href.startsWith('#');
                    return (
                        <li key={link.href}>
                            {isAnchor ? (
                                <a
                                    href={link.href}
                                    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    href={link.href}
                                    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                                >
                                    {link.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useContact, useRegistrationEnabled } from '@/lib/settings';
import BrandMark from '@/Components/Shared/BrandMark';
import LanguageSwitcher from '@/Components/Shared/LanguageSwitcher';

interface NavLink {
    label: string;
    href: string;
}

function useNavLinks(): NavLink[] {
    const t = useT();
    const contact = useContact();

    return [
        { label: t('public.nav.home', 'Home'), href: '/' },
        { label: t('public.nav.how_it_works', 'How it works'), href: '#how-it-works' },
        { label: t('public.nav.pricing', 'Pricing'), href: '/pricing' },
        ...(contact.enabled
            ? [
                  {
                      label: t('public.nav.contact', 'Contact'),
                      href: '/contact',
                  } satisfies NavLink,
              ]
            : []),
    ];
}

export default function PublicHeader() {
    const t = useT();
    const { props } = usePage();
    const user = (props as { auth?: { user?: { name?: string } | null } }).auth?.user ?? null;
    const links = useNavLinks();
    const registrationEnabled = useRegistrationEnabled();

    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (!mobileOpen) return;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);

    return (
        <header
            className={`sticky top-0 z-50 w-full transition-all duration-300 ${
                scrolled
                    ? 'glass-panel border-b border-surface-container'
                    : 'bg-transparent border-b border-transparent'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-16 md:h-20">
                <Link href="/" className="inline-flex items-center" aria-label={t('public.header.brand_alt', 'EduKitt home')}>
                    <BrandMark height={40} alt={t('public.header.brand_alt', 'EduKitt')} />
                </Link>

                <nav className="hidden md:flex items-center gap-9 font-headline font-bold tracking-tight text-sm">
                    {links.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-on-surface-variant hover:text-primary transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    <LanguageSwitcher />
                    {user ? (
                        <Link
                            href="/app/dashboard"
                            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110 transition-all active:scale-95"
                        >
                            {t('public.header.cta.dashboard', 'Open dashboard')}
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="px-4 py-2.5 rounded-full text-sm font-bold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                            >
                                {t('public.header.cta.sign_in', 'Sign in')}
                            </Link>
                            {registrationEnabled && (
                                <Link
                                    href="/register"
                                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110 transition-all active:scale-95"
                                >
                                    {t('public.header.cta.get_started', 'Get started free')}
                                </Link>
                            )}
                        </>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setMobileOpen((v) => !v)}
                    className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors"
                    aria-label={t('public.header.menu_toggle', 'Toggle menu')}
                    aria-expanded={mobileOpen}
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {mobileOpen && (
                <div className="md:hidden border-t border-surface-container bg-surface-container-lowest">
                    <div className="px-6 py-6 flex flex-col gap-1">
                        {links.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="px-3 py-3 rounded-xl text-base font-headline font-bold text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}

                        <div className="border-t border-surface-container mt-3 pt-4 flex flex-col gap-2">
                            <div className="flex justify-center pb-1">
                                <LanguageSwitcher />
                            </div>
                            {user ? (
                                <Link
                                    href="/app/dashboard"
                                    className="w-full text-center px-5 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold shadow-lg shadow-primary/20"
                                >
                                    {t('public.header.cta.dashboard', 'Open dashboard')}
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="w-full text-center px-4 py-3 rounded-full text-sm font-bold text-on-surface-variant bg-surface-container-low hover:text-primary transition-colors"
                                    >
                                        {t('public.header.cta.sign_in', 'Sign in')}
                                    </Link>
                                    {registrationEnabled && (
                                        <Link
                                            href="/register"
                                            className="w-full text-center px-5 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold shadow-lg shadow-primary/20"
                                        >
                                            {t('public.header.cta.get_started', 'Get started free')}
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

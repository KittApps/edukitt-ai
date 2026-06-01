import { User, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, usePage, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import HeaderSearch from './HeaderSearch';
import LanguageSwitcher from '@/Components/Shared/LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import { useT } from '@/lib/i18n';
import { useBrand } from '@/lib/settings';

interface NavItem {
    href: string;
    label: string;
    matches?: (path: string) => boolean;
    soon?: boolean;
}

export default function Header() {
    const { props, url } = usePage();
    const user = (props as { auth?: { user?: { name?: string; email?: string; is_admin?: boolean } } })
        .auth?.user;
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const t = useT();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const brand = useBrand();
    const navItems: NavItem[] = [
        {
            href: '/app/dashboard',
            label: t('header.nav.home', 'Home'),
            matches: (p) => p.startsWith('/app/dashboard'),
        },
        {
            href: '/app/library',
            label: t('header.nav.explore', 'Explore'),
            matches: (p) => p.startsWith('/app/library'),
        },
        ...(brand.support_enabled
            ? [
                  {
                      href: '/support',
                      label: t('header.nav.support', 'Support'),
                      matches: (p: string) => p.startsWith('/support'),
                  } satisfies NavItem,
              ]
            : []),
    ];

    const currentPath = url.split('?')[0];

    return (
        <header className="flex justify-between items-center w-full px-6 md:px-8 py-4 glass-panel sticky top-0 z-50 border-b border-surface-container print:hidden">
            <div className="flex items-center gap-6">
                <HeaderSearch />
            </div>

            <div className="hidden md:flex items-center gap-8 font-headline font-bold tracking-tight text-sm">
                {navItems.map((item) => {
                    const isActive = item.matches ? item.matches(currentPath) : false;

                    const baseClasses = isActive
                        ? 'text-primary border-b-2 border-primary pb-1'
                        : 'text-on-surface-variant hover:text-primary transition-colors';

                    const content = (
                        <span className="inline-flex items-center gap-2">
                            {item.label}
                            {item.soon && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container px-1.5 py-0.5 rounded-full text-on-surface-variant">
                                    {t('nav.badge.soon', 'Soon')}
                                </span>
                            )}
                        </span>
                    );

                    if (item.soon) {
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                className={baseClasses}
                                onClick={(e) => e.preventDefault()}
                            >
                                {content}
                            </a>
                        );
                    }

                    return (
                        <Link key={item.href} href={item.href} className={baseClasses}>
                            {content}
                        </Link>
                    );
                })}
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                <LanguageSwitcher />
                <ThemeSwitcher />

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                        <span className="text-white text-sm font-bold">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container py-2 z-50">
                            <div className="px-4 py-2 border-b border-surface-container">
                                <p className="text-sm font-bold text-on-surface">{user?.name}</p>
                                <p className="text-xs text-on-surface-variant">{user?.email}</p>
                            </div>
                            <Link
                                href="/profile"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                            >
                                <User size={14} />
                                {t('header.menu.profile', 'Profile')}
                            </Link>
                            {user?.is_admin && (
                                <Link
                                    href="/admin/dashboard"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                                >
                                    <LayoutDashboard size={14} />
                                    {t(
                                        'header.menu.admin_panel',
                                        'Admin panel',
                                    )}
                                </Link>
                            )}
                            <div className="my-1 border-t border-surface-container" />
                            <button
                                onClick={() => router.post('/logout')}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-on-surface-variant hover:text-red-500 hover:bg-surface-container-low transition-colors"
                            >
                                <LogOut size={14} />
                                {t('header.menu.logout', 'Log out')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

import { type ReactNode, useEffect } from 'react';
import Sidebar from '@/Components/App/Sidebar';
import Header from '@/Components/App/Header';
import MobileNav from '@/Components/App/MobileNav';
import LimitReachedModal from '@/Components/Billing/LimitReachedModal';
import ExpiredPlanBanner from '@/Components/Billing/ExpiredPlanBanner';
import { useLocale } from '@/lib/i18n';
import { themeClassFor, useTheme } from '@/lib/theme';

/**
 * Every theme key that exists in resources/css/app.css. Listed here so
 * we can scrub stale classes off <html> when the active theme changes
 * (Inertia keeps the same DOM across navigations, so we can't rely on
 * a fresh document load to clear them).
 *
 * Keep in sync with the .theme-* blocks at the bottom of app.css.
 */
const ALL_THEME_CLASSES = [
    'theme-dark',
    'theme-ocean',
    'theme-forest',
    'theme-sunset',
    'theme-sepia',
    'theme-slate',
    'theme-solarized',
    'theme-mint',
    'theme-nord',
];

export default function AppLayout({ children }: { children: ReactNode }) {
    const locale = useLocale();
    const theme = useTheme();
    const activeClass = themeClassFor(theme.active);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.dir = locale.direction;
        document.documentElement.lang = locale.code;
    }, [locale.direction, locale.code]);

    // Mirror the active theme class onto <html> so body / overscroll
    // backgrounds and any global CSS picks up the same tokens as the
    // layout root. Re-runs whenever the resolved theme changes (e.g.
    // when the user picks a different theme from the header switcher).
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const html = document.documentElement;
        ALL_THEME_CLASSES.forEach((cls) => html.classList.remove(cls));
        if (activeClass) html.classList.add(activeClass);
        return () => {
            if (activeClass) html.classList.remove(activeClass);
        };
    }, [activeClass]);

    return (
        <div
            className={`min-h-screen bg-surface${activeClass ? ` ${activeClass}` : ''} print:bg-white`}
        >
            <ExpiredPlanBanner />
            <Sidebar />
            <main className="md:ml-72 print:ml-0 min-h-screen flex flex-col pb-20 md:pb-0 print:pb-0">
                <Header />
                <div className="p-6 md:p-10 lg:p-12 max-w-7xl mx-auto w-full print:p-8 print:max-w-none">
                    {children}
                </div>
            </main>
            <MobileNav />
            <LimitReachedModal />
        </div>
    );
}

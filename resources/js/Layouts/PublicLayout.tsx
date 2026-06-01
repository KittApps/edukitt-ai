import { type ReactNode, useEffect } from 'react';
import CookieBanner from '@/Components/Public/CookieBanner';
import PublicHeader from '@/Components/Public/PublicHeader';
import PublicFooter from '@/Components/Public/PublicFooter';
import { useLocale } from '@/lib/i18n';

interface PublicLayoutProps {
    children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
    const locale = useLocale();

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.dir = locale.direction;
        document.documentElement.lang = locale.code;
    }, [locale.direction, locale.code]);

    return (
        <div className="min-h-screen flex flex-col bg-surface text-on-surface">
            <PublicHeader />
            <main className="flex-1">{children}</main>
            <PublicFooter />
            <CookieBanner />
        </div>
    );
}

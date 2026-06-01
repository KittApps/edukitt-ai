import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Sparkles, Library, Settings } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function MobileNav() {
    const { url } = usePage();
    const t = useT();

    const items = [
        {
            icon: <LayoutDashboard size={20} />,
            label: t('mobile_nav.home', 'Home'),
            href: '/app/dashboard',
        },
        {
            icon: <Sparkles size={20} />,
            label: t('mobile_nav.create', 'Create'),
            href: '/app/courses/create',
        },
        {
            icon: <Library size={20} />,
            label: t('mobile_nav.library', 'Library'),
            href: '/app/library',
        },
        {
            icon: <Settings size={20} />,
            label: t('mobile_nav.settings', 'Settings'),
            href: '#',
        },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 w-full glass-panel flex justify-around items-center py-3.5 pb-5 z-50 border-t border-surface-container print:hidden">
            {items.map((item) => {
                const active = item.href !== '#' && url.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center gap-1 transition-colors ${
                            active ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                    >
                        {item.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}

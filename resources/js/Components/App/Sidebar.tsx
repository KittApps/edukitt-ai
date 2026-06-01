import { type ReactNode, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Plus,
    Library,
    ChevronDown,
    BookOpen,
    Zap,
    ClipboardList,
    Award,
    CreditCard,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCertificateGate } from '@/lib/settings';
import BrandMark from '@/Components/Shared/BrandMark';

interface NavItemDef {
    icon: ReactNode;
    label: string;
    href?: string;
    submenu?: { icon: ReactNode; label: string; href: string }[];
    badge?: string;
    /** Hidden navigation items are filtered out entirely. */
    hidden?: boolean;
}

const createPaths = ['/app/courses/create', '/app/quick-learns/create', '/app/quizzes/create'];

function useNavItems(): NavItemDef[] {
    const t = useT();
    const certGate = useCertificateGate();

    return [
        {
            icon: <LayoutDashboard size={20} />,
            label: t('nav.dashboard', 'Dashboard'),
            href: '/app/dashboard',
        },
        {
            icon: <Plus size={20} />,
            label: t('nav.create', 'Create New'),
            submenu: [
                {
                    icon: <Zap size={18} />,
                    label: t('nav.create.quick_learn', 'Quick Learn'),
                    href: '/app/quick-learns/create',
                },
                {
                    icon: <BookOpen size={18} />,
                    label: t('nav.create.course', 'Course'),
                    href: '/app/courses/create',
                },
                {
                    icon: <ClipboardList size={18} />,
                    label: t('nav.create.quiz', 'Quiz'),
                    href: '/app/quizzes/create',
                },
            ],
        },
        {
            icon: <Library size={20} />,
            label: t('nav.library', 'My Library'),
            href: '/app/library',
        },
        {
            icon: <Award size={20} />,
            label: t('nav.certificates', 'Certificates'),
            href: '/app/certificates',
            hidden: !certGate.enabled,
            badge:
                certGate.enabled && !certGate.plan_allows
                    ? t('nav.badge.pro', 'Pro')
                    : undefined,
        },
        {
            icon: <CreditCard size={20} />,
            label: t('nav.subscription', 'Subscription'),
            href: '/app/subscription',
        },
    ];
}

function NavItem({
    icon,
    label,
    active = false,
    href,
    badge,
}: {
    icon: ReactNode;
    label: string;
    active?: boolean;
    href?: string;
    badge?: string;
}) {
    const Tag = href && href !== '#' ? Link : 'button';
    const props = href && href !== '#' ? { href } : {};

    return (
        <Tag
            {...(props as any)}
            className={`w-full flex items-center gap-4 px-8 py-3.5 rounded-r-full font-bold transition-all duration-200 group ${
                active
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:translate-x-1 hover:bg-white/60'
            }`}
        >
            <span
                className={`transition-colors ${
                    active
                        ? 'text-primary'
                        : 'text-on-surface-variant group-hover:text-primary'
                }`}
            >
                {icon}
            </span>
            <span className="text-sm text-left flex-1">{label}</span>
            {badge && (
                <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        badge.toLowerCase() === 'pro'
                            ? 'bg-gradient-to-r from-primary to-primary-container text-white'
                            : 'bg-surface-container text-on-surface-variant'
                    }`}
                >
                    {badge}
                </span>
            )}
        </Tag>
    );
}

function ExpandableNavItem({
    icon,
    label,
    submenu,
    isActive,
}: {
    icon: ReactNode;
    label: string;
    submenu: { icon: ReactNode; label: string; href: string }[];
    isActive: boolean;
}) {
    const [open, setOpen] = useState(isActive);
    const { url } = usePage();

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center gap-4 px-8 py-3.5 rounded-r-full font-bold transition-all duration-200 group ${
                    isActive
                        ? 'text-primary'
                        : 'text-on-surface-variant hover:translate-x-1 hover:bg-white/60'
                }`}
            >
                <span
                    className={`transition-colors ${
                        isActive
                            ? 'text-primary'
                            : 'text-on-surface-variant group-hover:text-primary'
                    }`}
                >
                    {icon}
                </span>
                <span className="text-sm flex-1 text-left">{label}</span>
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <div
                className={`overflow-hidden transition-all duration-200 ${
                    open ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="py-1 space-y-0.5">
                    {submenu.map((sub) => {
                        const isSubActive = url.startsWith(sub.href);
                        return (
                            <Link
                                key={sub.href}
                                href={sub.href}
                                className={`w-full flex items-center gap-3.5 pl-16 pr-8 py-2.5 rounded-r-full transition-all duration-200 group ${
                                    isSubActive
                                        ? 'text-primary bg-surface-container-lowest'
                                        : 'text-on-surface-variant hover:text-primary hover:bg-white/60'
                                }`}
                            >
                                <span
                                    className={`transition-colors ${
                                        isSubActive
                                            ? 'text-primary'
                                            : 'text-on-surface-variant group-hover:text-primary'
                                    }`}
                                >
                                    {sub.icon}
                                </span>
                                <span className="text-[13px] font-semibold">{sub.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function Sidebar() {
    const { url } = usePage();
    const t = useT();
    const navItems = useNavItems();

    return (
        <aside className="fixed left-0 top-0 h-full py-8 pr-4 w-72 flex-col bg-surface-container-low z-40 hidden md:flex print:hidden">
            <div className="px-8 mb-10">
                <Link href="/app/dashboard" className="inline-flex items-center">
                    <BrandMark height={40} alt={t('sidebar.brand_alt', 'EduKitt')} />
                </Link>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                {navItems.filter((item) => !item.hidden).map((item) =>
                    item.submenu ? (
                        <ExpandableNavItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            submenu={item.submenu}
                            isActive={createPaths.some((p) => url.startsWith(p))}
                        />
                    ) : (
                        <NavItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            active={item.href ? url.startsWith(item.href) : false}
                            href={item.href}
                            badge={
                                item.badge === 'soon'
                                    ? t('nav.badge.soon', 'Soon')
                                    : item.badge
                            }
                        />
                    ),
                )}
            </nav>

            <div className="px-8 mt-auto pt-6">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 mb-6 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary mb-1.5 uppercase tracking-wider">
                        {t('sidebar.pro.kicker', 'Pro Access')}
                    </p>
                    <p className="text-sm text-on-surface-variant mb-4 font-medium leading-relaxed">
                        {t(
                            'sidebar.pro.description',
                            'Unlock advanced AI courses & personalized learning paths.',
                        )}
                    </p>
                    <Link
                        href="/app/subscription"
                        className="block w-full text-center py-2.5 bg-gradient-to-r from-primary to-primary-container text-white text-xs font-bold rounded-full transition-all active:scale-95 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110"
                    >
                        {t('sidebar.pro.cta', 'Upgrade to Pro')}
                    </Link>
                </div>
            </div>
        </aside>
    );
}

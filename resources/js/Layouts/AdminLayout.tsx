import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { useBrand } from '@/lib/settings';
import {
    LayoutDashboard,
    Users,
    Settings,
    ChevronDown,
    LogOut,
    Menu,
    X,
    GraduationCap,
    Globe,
    Bot,
    FileText,
    Languages,
    BarChart3,
    Cpu,
    Receipt,
    CreditCard,
    Wallet,
    Coins,
    Mail,
    ListTodo,
    LifeBuoy,
    FileCog,
    DollarSign,
    Package,
    BookOpen,
    AlertTriangle,
    User as UserIcon,
    ExternalLink,
} from 'lucide-react';

interface Props {
    children: ReactNode;
}

const menuItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={18} /> },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: <CreditCard size={18} /> },
    { label: 'Transactions', href: '/admin/transactions', icon: <Wallet size={18} /> },
    {
        label: 'Catalog',
        icon: <Package size={18} />,
        submenu: [
            { label: 'Subscription Plans', href: '/admin/subscription-plans', icon: <CreditCard size={16} /> },
            { label: 'Credit Packs', href: '/admin/credit-packages', icon: <Coins size={16} /> },
        ],
    },
    {
        label: 'Content',
        icon: <BookOpen size={18} />,
        submenu: [
            { label: 'Support', href: '/admin/support', icon: <LifeBuoy size={16} /> },
            { label: 'Pages', href: '/admin/pages', icon: <FileCog size={16} /> },
        ],
    },
    {
        label: 'Analytics',
        icon: <BarChart3 size={18} />,
        submenu: [
            { label: 'AI Tokens Usage', href: '/admin/analytics/ai-tokens-usage', icon: <Cpu size={16} /> },
            { label: 'AI Tokens Cost', href: '/admin/analytics/ai-tokens-cost', icon: <Receipt size={16} /> },
            { label: 'AI Failures', href: '/admin/analytics/ai-failures', icon: <AlertTriangle size={16} /> },
            { label: 'Revenue', href: '/admin/analytics/revenue', icon: <DollarSign size={16} /> },
        ],
    },
    {
        label: 'Settings',
        icon: <Settings size={18} />,
        submenu: [
            { label: 'General', href: '/admin/settings/general', icon: <Globe size={16} /> },
            { label: 'AI Providers', href: '/admin/settings/ai-providers', icon: <Bot size={16} /> },
            { label: 'AI Content', href: '/admin/settings/ai-content', icon: <FileText size={16} /> },
            { label: 'Billings', href: '/admin/settings/billings', icon: <Wallet size={16} /> },
            { label: 'Email', href: '/admin/settings/email', icon: <Mail size={16} /> },
            { label: 'Queue', href: '/admin/settings/queue', icon: <ListTodo size={16} /> },
            { label: 'Localization', href: '/admin/settings/localization', icon: <Languages size={16} /> },
        ],
    },
];

// A submenu is "active" when any of its children's hrefs is a prefix
// of the current url. Derived from the menu config so adding a new
// group doesn't require touching `isGroupActive` below.
function groupContainsUrl(group: (typeof menuItems)[number], url: string): boolean {
    return !!group.submenu?.some((sub) => url.startsWith(sub.href));
}

export default function AdminLayout({ children }: Props) {
    const { url, props } = usePage();
    const user = (props as any).auth?.user;
    const brand = useBrand();
    const brandName = brand.name ?? 'EduAI';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement | null>(null);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(
            menuItems
                .filter((m) => m.submenu)
                .map((m) => [m.label, groupContainsUrl(m, url)]),
        ),
    );

    const toggleGroup = (label: string) =>
        setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

    const isGroupActive = (label: string) => {
        const group = menuItems.find((m) => m.label === label);
        return group ? groupContainsUrl(group, url) : false;
    };

    // Close the profile dropdown when clicking outside it or pressing Escape.
    // Lives at the layout level so every admin page inherits the behaviour
    // without each consumer wiring its own listener.
    useEffect(() => {
        if (!profileOpen) return;

        const handlePointer = (event: MouseEvent) => {
            if (!profileMenuRef.current?.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setProfileOpen(false);
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [profileOpen]);

    return (
        <div className="admin-app min-h-screen bg-surface flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#232f3e] border-r border-[#1a222f] flex flex-col transition-transform md:translate-x-0 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="p-6 border-b border-[#1a222f]">
                    <Link href="/admin/dashboard" className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 bg-primary flex items-center justify-center">
                            <GraduationCap size={18} className="text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <span className="font-headline font-semibold text-white text-sm truncate block max-w-[10rem]" title={brandName}>
                                {brandName}
                            </span>
                            <span className="block text-[10px] font-semibold text-[#aab7b8] uppercase tracking-wide">Admin</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) =>
                        item.submenu ? (
                            <div key={item.label}>
                                <button
                                    onClick={() => toggleGroup(item.label)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${
                                        isGroupActive(item.label)
                                            ? 'text-white bg-white/10'
                                            : 'text-[#d5dbdb] hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {item.icon}
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <ChevronDown size={14} className={`transition-transform ${openGroups[item.label] ? 'rotate-180' : ''}`} />
                                </button>
                                {openGroups[item.label] && (
                                    <div className="ml-4 mt-1 space-y-0.5 border-l border-[#31465f] pl-2">
                                        {item.submenu.map((sub) => (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                                                    url === sub.href
                                                        ? 'text-white bg-[#0972d3] font-semibold'
                                                        : 'text-[#aab7b8] hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                {sub.icon}
                                                {sub.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${
                                    item.href !== '#' && url.startsWith(item.href)
                                        ? 'text-white bg-[#0972d3]'
                                        : 'text-[#d5dbdb] hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {item.icon}
                                <span className="flex-1">{item.label}</span>
                                {(item as any).badge && (
                                    <span className="text-[9px] font-semibold bg-[#1a222f] px-2 py-0.5 text-[#aab7b8] border border-[#31465f]">{(item as any).badge}</span>
                                )}
                            </Link>
                        )
                    )}
                </nav>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="bg-surface-container-lowest border-b border-surface-container px-6 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-surface-container-low text-on-surface">
                        <Menu size={20} />
                    </button>
                    <div />
                    <div className="flex items-center gap-2">
                        <a
                            href="/app/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
                        >
                            <ExternalLink size={14} />
                            Go to App
                        </a>

                        <div className="relative" ref={profileMenuRef}>
                            <button
                                type="button"
                                onClick={() => setProfileOpen((v) => !v)}
                                aria-haspopup="menu"
                                aria-expanded={profileOpen}
                                className="flex items-center gap-2.5 pl-2 pr-2 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
                            >
                                <span className="hidden sm:inline text-sm font-medium text-on-surface-variant">
                                    {user?.name}
                                </span>
                                <div className="h-8 w-8 bg-[#0972d3] flex items-center justify-center border border-surface-container">
                                    <span className="text-white text-xs font-semibold">
                                        {user?.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={14}
                                    className={`text-on-surface-variant transition-transform ${
                                        profileOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {profileOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg overflow-hidden z-40"
                                >
                                    <div className="px-4 py-3 border-b border-surface-container">
                                        <p className="text-sm font-semibold text-on-surface truncate">
                                            {user?.name}
                                        </p>
                                        <p className="text-xs text-on-surface-variant truncate">
                                            {user?.email}
                                        </p>
                                    </div>
                                    <div className="py-1">
                                        <Link
                                            href={user?.id ? `/admin/users/${user.id}/edit` : '#'}
                                            onClick={() => setProfileOpen(false)}
                                            role="menuitem"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                        >
                                            <UserIcon size={16} className="text-on-surface-variant" />
                                            Profile
                                        </Link>
                                        <a
                                            href="/app/dashboard"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setProfileOpen(false)}
                                            role="menuitem"
                                            className="sm:hidden flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                        >
                                            <ExternalLink size={16} className="text-on-surface-variant" />
                                            Go to App
                                        </a>
                                    </div>
                                    <div className="border-t border-surface-container py-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProfileOpen(false);
                                                router.post('/logout');
                                            }}
                                            role="menuitem"
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-error hover:bg-error/5 transition-colors"
                                        >
                                            <LogOut size={16} />
                                            Log Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8 max-w-6xl w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}

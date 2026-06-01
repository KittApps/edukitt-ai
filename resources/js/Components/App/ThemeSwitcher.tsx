import { router } from '@inertiajs/react';
import { Check, ChevronDown, Moon, Palette, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useTheme } from '@/lib/theme';
import { useT } from '@/lib/i18n';

/**
 * Header dropdown that lets a signed-in user pick their app-side theme.
 *
 * Hidden entirely when:
 *   - the admin has disabled user theme selection, or
 *   - fewer than two themes are enabled (nothing to switch between).
 *
 * Visually mirrors the LanguageSwitcher: chevron-pill button → flag
 * popover with active checkmark, so the header stays consistent.
 */
export default function ThemeSwitcher() {
    const t = useT();
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!theme.allow_user_selection || theme.available.length <= 1) {
        return null;
    }

    const current = theme.available.find((t) => t.key === theme.active);

    const switchTo = (key: string) => {
        if (key === theme.active) {
            setOpen(false);
            return;
        }
        router.post(
            '/theme/switch',
            { key },
            {
                preserveScroll: true,
                onFinish: () => setOpen(false),
            },
        );
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all"
                title={
                    current?.name
                        ? `${t('theme.switch.tooltip', 'Change theme')} (${current.name})`
                        : t('theme.switch.tooltip', 'Change theme')
                }
                aria-label={t('theme.switch.tooltip', 'Change theme')}
            >
                <Palette size={16} />
                <ChevronDown
                    size={14}
                    className={`transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container py-1.5 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {t('theme.switch.label', 'Theme')}
                    </div>
                    {theme.available.map((row) => {
                        const isActive = row.key === theme.active;
                        return (
                            <button
                                key={row.key}
                                onClick={() => switchTo(row.key)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                                    isActive
                                        ? 'text-primary bg-primary/5'
                                        : 'text-on-surface hover:bg-surface-container-low'
                                }`}
                            >
                                <span
                                    className={`p-1.5 rounded-md flex-shrink-0 ${
                                        row.is_dark
                                            ? 'bg-on-surface text-surface-container-lowest'
                                            : 'bg-primary/10 text-primary'
                                    }`}
                                >
                                    {row.is_dark ? (
                                        <Moon size={12} />
                                    ) : (
                                        <Sun size={12} />
                                    )}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <p
                                        className={`font-bold truncate ${
                                            isActive
                                                ? 'text-primary'
                                                : 'text-on-surface'
                                        }`}
                                    >
                                        {row.name}
                                    </p>
                                </span>
                                {isActive && (
                                    <Check
                                        size={14}
                                        className="text-primary flex-shrink-0"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

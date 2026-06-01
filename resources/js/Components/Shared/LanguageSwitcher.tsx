import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Check, ChevronDown } from 'lucide-react';
import CountryFlag from './CountryFlag';
import { useLocale, useT } from '@/lib/i18n';
import { useBrand } from '@/lib/settings';

/**
 * Shared language switcher used by both the authenticated app shell
 * and the public marketing layout. The component is fully
 * context-agnostic — it derives state from `useLocale()` (which is
 * populated for every Inertia request, authenticated or not) and
 * posts to the public `/locale` endpoint.
 *
 * Returns null when the admin has disabled the selector, or when
 * the site has 0 or 1 active language, so the trigger only appears
 * once a real choice exists.
 */
export default function LanguageSwitcher() {
    const locale = useLocale();
    const brand = useBrand();
    const t = useT();
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

    if (!brand.language_switcher_enabled) {
        return null;
    }

    if (!locale.available || locale.available.length <= 1) {
        return null;
    }

    const current = locale.available.find((l) => l.code === locale.code);

    const switchTo = (code: string) => {
        if (code === locale.code) {
            setOpen(false);
            return;
        }
        router.post(
            '/locale',
            { code },
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
                    current?.native_name
                        ? `${t('lang.switch.tooltip', 'Change language')} (${current.native_name})`
                        : t('lang.switch.tooltip', 'Change language')
                }
            >
                <CountryFlag
                    languageCode={current?.code ?? locale.code}
                    emojiFlag={current?.flag}
                    label={current?.native_name ?? current?.code ?? locale.code}
                />
                <ChevronDown
                    size={14}
                    className={`transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container py-1.5 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {t('lang.switch.label', 'Language')}
                    </div>
                    {locale.available.map((lang) => {
                        const isActive = lang.code === locale.code;
                        return (
                            <button
                                key={lang.code}
                                onClick={() => switchTo(lang.code)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                                    isActive
                                        ? 'text-primary bg-primary/5'
                                        : 'text-on-surface hover:bg-surface-container-low'
                                }`}
                            >
                                <CountryFlag
                                    languageCode={lang.code}
                                    emojiFlag={lang.flag}
                                    label={lang.native_name}
                                />
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`font-bold truncate ${
                                            isActive ? 'text-primary' : 'text-on-surface'
                                        }`}
                                    >
                                        {lang.native_name}
                                    </p>
                                    <p className="text-[10px] text-on-surface-variant truncate">
                                        {lang.name} · {lang.code.toUpperCase()}
                                    </p>
                                </div>
                                {isActive && (
                                    <Check size={14} className="text-primary flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

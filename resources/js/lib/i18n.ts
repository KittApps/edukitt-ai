import { usePage } from '@inertiajs/react';

export interface AvailableLocale {
    code: string;
    name: string;
    native_name: string;
    flag: string;
    direction: 'ltr' | 'rtl';
}

export interface LocaleInfo {
    code: string;
    direction: 'ltr' | 'rtl';
    available: AvailableLocale[];
}

export type Replacements = Record<string, string | number>;

/**
 * Interpolates {placeholder} tokens in a translated string.
 */
function interpolate(text: string, replace?: Replacements): string {
    if (!replace) return text;
    let out = text;
    for (const [placeholder, value] of Object.entries(replace)) {
        out = out.split(`{${placeholder}}`).join(String(value));
    }
    return out;
}

/**
 * Hook that returns a translator bound to the current locale.
 *
 * Usage:
 *   const t = useT();
 *   t('nav.dashboard', 'Dashboard')
 *   t('courses.progress', '{completed} of {total} lessons', { completed: 3, total: 10 })
 */
export function useT() {
    const { props } = usePage();
    const dict = ((props as Record<string, unknown>).translations ?? {}) as Record<
        string,
        string
    >;

    return (key: string, fallback?: string, replace?: Replacements): string => {
        const text = dict[key] ?? fallback ?? key;
        return interpolate(text, replace);
    };
}

/**
 * Hook that returns the current locale info.
 */
export function useLocale(): LocaleInfo {
    const { props } = usePage();
    return (
        ((props as Record<string, unknown>).locale as LocaleInfo | undefined) ?? {
            code: 'en',
            direction: 'ltr',
            available: [],
        }
    );
}

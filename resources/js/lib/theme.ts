import { usePage } from '@inertiajs/react';

export interface AvailableTheme {
    key: string;
    name: string;
    is_dark: boolean;
}

export interface ThemeInfo {
    /**
     * The theme key currently active for this page. The special value
     * `default` means "no scoped class — use the @theme block as-is".
     * Any other value is also the CSS class name applied on the layout
     * root and on <html>.
     */
    active: string;
    allow_user_selection: boolean;
    available: AvailableTheme[];
}

interface SettingsShape {
    theme?: ThemeInfo;
}

/**
 * Hook returning the active app-side theme + the catalogue of themes
 * the current viewer may switch between.
 *
 * Resolution happens server-side (see ThemeSettings::resolveActiveKey)
 * so this hook only ever has to read what the middleware shared.
 */
export function useTheme(): ThemeInfo {
    const { props } = usePage();
    const settings = (props as Record<string, unknown>).settings as
        | SettingsShape
        | undefined;
    return (
        settings?.theme ?? {
            active: 'default',
            allow_user_selection: false,
            available: [],
        }
    );
}

/**
 * The CSS class to apply on the layout root / <html> for a given theme
 * key. Returns null for the `default` theme since it has no scoped class.
 */
export function themeClassFor(key: string): string | null {
    return key === 'default' || key === '' ? null : key;
}

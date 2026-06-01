import { usePage } from '@inertiajs/react';

import { useTheme, type AvailableTheme } from './theme';

export interface PublicBrand {
    name: string | null;
    logo: string | null;
    logo_dark: string | null;
    favicon: string | null;
    site_title: string | null;
    site_description: string | null;
    support_enabled: boolean;
    language_switcher_enabled: boolean;
}

export interface PublicRecaptcha {
    enabled: boolean;
    site_key: string | null;
}

export interface PublicGdpr {
    enabled: boolean;
    banner_message: string;
    accept_label: string;
    decline_label: string;
    policy_url: string | null;
    policy_label: string;
}

export interface PublicContact {
    enabled: boolean;
}

export interface PublicCurrency {
    code: string;
    symbol: string;
}

export interface PublicCertificates {
    enabled: boolean;
    primary_color: string;
    background_color: string;
}

export interface PublicSettings {
    register: {
        enabled: boolean;
        email_verification: boolean;
    };
    brand: PublicBrand;
    recaptcha: PublicRecaptcha;
    gdpr: PublicGdpr;
    contact: PublicContact;
    currency: PublicCurrency;
    certificates: PublicCertificates;
}

/**
 * Read the public-facing subset of admin settings shared by
 * `HandleInertiaRequests::publicSettings()`.
 *
 * Defaults match the GeneralSettings defaults on the backend so SSR
 * and first-render before Inertia hydration never flicker.
 */
export function usePublicSettings(): PublicSettings {
    const { props } = usePage();
    const settings =
        (props as { settings?: Partial<PublicSettings> | null }).settings ??
        undefined;

    return {
        register: {
            enabled: settings?.register?.enabled ?? true,
            email_verification: settings?.register?.email_verification ?? false,
        },
        brand: {
            name: settings?.brand?.name ?? null,
            logo: settings?.brand?.logo ?? null,
            logo_dark: settings?.brand?.logo_dark ?? null,
            favicon: settings?.brand?.favicon ?? null,
            site_title: settings?.brand?.site_title ?? null,
            site_description: settings?.brand?.site_description ?? null,
            support_enabled: settings?.brand?.support_enabled ?? true,
            language_switcher_enabled:
                settings?.brand?.language_switcher_enabled ?? true,
        },
        recaptcha: {
            enabled: settings?.recaptcha?.enabled ?? false,
            site_key: settings?.recaptcha?.site_key ?? null,
        },
        gdpr: {
            enabled: settings?.gdpr?.enabled ?? false,
            banner_message:
                settings?.gdpr?.banner_message ??
                'We use cookies to provide essential functionality and to improve your experience. By continuing, you agree to our use of cookies.',
            accept_label: settings?.gdpr?.accept_label ?? 'Accept',
            decline_label: settings?.gdpr?.decline_label ?? 'Decline',
            policy_url: settings?.gdpr?.policy_url ?? null,
            policy_label: settings?.gdpr?.policy_label ?? 'Learn more',
        },
        contact: {
            enabled: settings?.contact?.enabled ?? true,
        },
        currency: {
            code: settings?.currency?.code ?? 'USD',
            symbol: settings?.currency?.symbol ?? '$',
        },
        certificates: {
            enabled: settings?.certificates?.enabled ?? true,
            primary_color: settings?.certificates?.primary_color ?? '#6366f1',
            background_color:
                settings?.certificates?.background_color ?? '#ffffff',
        },
    };
}

export function useRecaptcha(): PublicRecaptcha {
    return usePublicSettings().recaptcha;
}

export function useGdpr(): PublicGdpr {
    return usePublicSettings().gdpr;
}

export function useContact(): PublicContact {
    return usePublicSettings().contact;
}

export function useCertificateSettings(): PublicCertificates {
    return usePublicSettings().certificates;
}

interface BillingEntitlementsShared {
    entitlements?: {
        /** Effective gate: global enabled AND plan allows. */
        certificates?: boolean;
        /** Plan-only flag (use for "Pro" badges). */
        certificates_plan?: boolean;
    };
}

/**
 * Returns the resolved certificate gates the UI should respect:
 *   - `enabled`        — show certificate UI at all (global toggle).
 *   - `accessible`     — user can actually use the feature right now.
 *   - `plan_allows`    — user's plan would allow it if the master
 *                        toggle is on (drives the Pro upsell badge).
 */
export function useCertificateGate(): {
    enabled: boolean;
    accessible: boolean;
    plan_allows: boolean;
} {
    const { enabled } = useCertificateSettings();
    const { props } = usePage();
    const billing =
        (props as { billing?: BillingEntitlementsShared | null }).billing ??
        null;
    const planAllows = billing?.entitlements?.certificates_plan ?? false;
    const accessible = billing?.entitlements?.certificates ?? false;

    return {
        enabled,
        accessible: enabled && accessible,
        plan_allows: planAllows,
    };
}

export interface FormatMoneyOptions {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    /** Replace a zero value with this label (e.g. "Free"). */
    zeroAs?: string;
}

export interface CurrencyHelper extends PublicCurrency {
    /** Format a number with the configured symbol prefix. */
    format: (value: number, options?: FormatMoneyOptions) => string;
}

/**
 * Read the admin-managed display currency. The returned `format`
 * helper prefixes the configured symbol and locale-formats the
 * number, so callers don't need to reimplement that pattern.
 */
export function useCurrency(): CurrencyHelper {
    const { code, symbol } = usePublicSettings().currency;

    const format = (value: number, options?: FormatMoneyOptions): string => {
        if (value === 0 && options?.zeroAs !== undefined) {
            return options.zeroAs;
        }

        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: options?.minimumFractionDigits ?? 0,
            maximumFractionDigits: options?.maximumFractionDigits ?? 2,
        }).format(value);

        return `${symbol}${formatted}`;
    };

    return { code, symbol, format };
}

export function useRegistrationEnabled(): boolean {
    return usePublicSettings().register.enabled;
}

export function useBrand(): PublicBrand {
    return usePublicSettings().brand;
}

/**
 * Resolve the logo URL the current theme should render with.
 * Falls back to the light logo when no dark variant is uploaded so
 * dark themes still show something instead of a missing image, and
 * returns null when no logo is uploaded at all (caller should render
 * a brand-name text fallback).
 */
export function useBrandLogo(): string | null {
    const brand = useBrand();
    const theme = useTheme();
    const activeIsDark = isActiveDark(theme.active, theme.available);

    if (activeIsDark) {
        return brand.logo_dark ?? brand.logo;
    }
    return brand.logo;
}

function isActiveDark(activeKey: string, available: AvailableTheme[]): boolean {
    return available.find((t) => t.key === activeKey)?.is_dark ?? false;
}

import { useBrand, useBrandLogo } from '@/lib/settings';

interface Props {
    /** Pixel height of the rendered logo / text. */
    height?: number;
    /** Tailwind class applied to the <img> when a logo is shown. */
    className?: string;
    /** Tailwind class applied to the text fallback when no logo is set. */
    textClassName?: string;
    /** Fallback brand name if the admin hasn't configured one. */
    fallbackName?: string;
    /** Optional override for the alt text on the <img>. */
    alt?: string;
    /**
     * When true and a light logo is rendered on a dark background
     * surface (e.g. the AuthLayout hero), invert the image so it
     * stays legible. The dark-mode logo upload is the proper fix,
     * this is just the historical behaviour preserved.
     */
    invert?: boolean;
}

/**
 * Renders the admin-configured logo, falling back to the brand name
 * as text when no logo is uploaded. Automatically picks the dark
 * variant when the active theme is dark (with light-logo fallback).
 *
 * Used by every layout (App sidebar, AuthLayout, PublicHeader,
 * PublicFooter) so one upload reskins the whole app.
 */
export default function BrandMark({
    height = 40,
    className = '',
    textClassName = '',
    fallbackName = 'EduKitt',
    alt,
    invert = false,
}: Props) {
    const brand = useBrand();
    const logoUrl = useBrandLogo();
    const displayName = brand.name ?? fallbackName;

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={alt ?? displayName}
                style={{ height }}
                className={`w-auto ${invert ? 'brightness-0 invert' : ''} ${className}`.trim()}
            />
        );
    }

    return (
        <span
            className={`font-headline font-extrabold tracking-tight ${textClassName}`.trim()}
            style={{ fontSize: Math.round(height * 0.45) }}
        >
            {displayName}
        </span>
    );
}

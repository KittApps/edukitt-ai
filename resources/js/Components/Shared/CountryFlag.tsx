import { Languages } from 'lucide-react';
import { useState } from 'react';

import {
    countryForLanguage,
    flagImageUrl,
    flagSrcSet,
    type FlagSize,
} from '@/lib/flag';

interface Props {
    /** Language code, e.g. "en" or "pt-BR". */
    languageCode: string;
    /** Optional emoji flag (used as a fallback to derive the country). */
    emojiFlag?: string | null;
    /** Accessible label for screen readers. */
    label?: string;
    /** Flag image bucket on flagcdn.com (w20 ≈ 20px wide). */
    size?: FlagSize;
    /** Tailwind classes controlling the rendered size. */
    className?: string;
}

/**
 * Tiny country-flag image with graceful fallback. If we can't resolve
 * a country for the language, or the image fails to load (offline /
 * blocked), we render a neutral `Languages` icon instead.
 */
export default function CountryFlag({
    languageCode,
    emojiFlag,
    label,
    size = 'w40',
    className = 'w-5 h-[15px] rounded-sm object-cover',
}: Props) {
    const country = countryForLanguage(languageCode, emojiFlag);
    const [failed, setFailed] = useState(false);

    if (!country || failed) {
        return (
            <Languages
                size={16}
                className="text-on-surface-variant flex-shrink-0"
                aria-label={label}
            />
        );
    }

    return (
        <img
            src={flagImageUrl(country, size)}
            srcSet={flagSrcSet(country, size)}
            alt={label ?? `${country.toUpperCase()} flag`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={`${className} flex-shrink-0`}
        />
    );
}

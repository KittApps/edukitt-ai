/**
 * Helpers for resolving an ISO 3166-1 alpha-2 country code from a language
 * code (or its emoji flag), and for building flag image URLs from the
 * free flagcdn.com CDN (https://flagcdn.com).
 *
 * Flag images don't require an API key; they're plain PNG/SVG assets
 * served from a CDN. We prefer PNG with srcSet to stay sharp on HiDPI.
 */

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
    en: 'us',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    pt: 'pt',
    ru: 'ru',
    zh: 'cn',
    ja: 'jp',
    ko: 'kr',
    ar: 'sa',
    hi: 'in',
    bn: 'bd',
    tr: 'tr',
    nl: 'nl',
    pl: 'pl',
    sv: 'se',
    no: 'no',
    nb: 'no',
    nn: 'no',
    da: 'dk',
    fi: 'fi',
    el: 'gr',
    he: 'il',
    th: 'th',
    vi: 'vn',
    id: 'id',
    ms: 'my',
    cs: 'cz',
    sk: 'sk',
    uk: 'ua',
    ro: 'ro',
    hu: 'hu',
    fa: 'ir',
    ur: 'pk',
    si: 'lk',
    ta: 'in',
    te: 'in',
    bg: 'bg',
    hr: 'hr',
    sr: 'rs',
    sl: 'si',
    et: 'ee',
    lv: 'lv',
    lt: 'lt',
    ca: 'es',
    eu: 'es',
    gl: 'es',
    sq: 'al',
    mk: 'mk',
    is: 'is',
    ga: 'ie',
    cy: 'gb',
    mt: 'mt',
    af: 'za',
    sw: 'ke',
    am: 'et',
    my: 'mm',
    km: 'kh',
    lo: 'la',
    ne: 'np',
    pa: 'in',
    gu: 'in',
    kn: 'in',
    ml: 'in',
    mr: 'in',
};

/**
 * Parse the country out of a regional-indicator-symbol emoji flag,
 * e.g. "🇺🇸" → "us".
 */
function countryFromEmojiFlag(emoji: string): string | null {
    const chars = [...emoji.trim()];
    if (chars.length !== 2) return null;
    const points = chars.map((c) => c.codePointAt(0) ?? 0);
    const A = 0x1f1e6;
    const Z = 0x1f1ff;
    if (points.some((p) => p < A || p > Z)) return null;
    return points
        .map((p) => String.fromCharCode(p - A + 'a'.charCodeAt(0)))
        .join('');
}

/**
 * Resolve a 2-letter country code for a language. Returns null when no
 * sensible mapping exists (caller should fall back to a generic icon).
 */
export function countryForLanguage(
    languageCode: string,
    emojiFlag?: string | null,
): string | null {
    const lower = (languageCode ?? '').toLowerCase().trim();
    if (!lower) return emojiFlag ? countryFromEmojiFlag(emojiFlag) : null;

    const localeMatch = lower.match(/^[a-z]{2,3}[-_]([a-z]{2})$/);
    if (localeMatch) {
        return localeMatch[1];
    }

    if (LANGUAGE_TO_COUNTRY[lower]) {
        return LANGUAGE_TO_COUNTRY[lower];
    }

    if (emojiFlag) {
        const fromEmoji = countryFromEmojiFlag(emojiFlag);
        if (fromEmoji) return fromEmoji;
    }

    if (/^[a-z]{2}$/.test(lower)) {
        return lower;
    }

    return null;
}

export type FlagSize = 'w20' | 'w40' | 'w80' | 'w160';

/**
 * Build a flag PNG URL from flagcdn.com.
 * @see https://flagcdn.com
 */
export function flagImageUrl(country: string, size: FlagSize = 'w40'): string {
    return `https://flagcdn.com/${size}/${country.toLowerCase()}.png`;
}

/**
 * Build a srcSet for 1x/2x rendering — keeps small flags crisp on HiDPI.
 */
export function flagSrcSet(country: string, size: FlagSize = 'w20'): string {
    const upscale: Record<FlagSize, FlagSize> = {
        w20: 'w40',
        w40: 'w80',
        w80: 'w160',
        w160: 'w160',
    };
    return `${flagImageUrl(country, size)} 1x, ${flagImageUrl(country, upscale[size])} 2x`;
}

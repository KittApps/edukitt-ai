export const DEFAULT_CURRENCY = 'USD';

/** $1,234.56 — full precision, ideal for tables and tooltips. */
export function formatMoney(value: number, currency: string = DEFAULT_CURRENCY): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value ?? 0);
}

/** Compact money for axis ticks: $1.2K, $34.5K, $2.1M. */
export function compactMoney(value: number, currency: string = DEFAULT_CURRENCY): string {
    const symbol = symbolFor(currency);
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${symbol}${(value / 1_000).toFixed(1)}K`;
    if (abs >= 100) return `${symbol}${value.toFixed(0)}`;
    return `${symbol}${value.toFixed(2)}`;
}

/** $0.0123 — for fractional per-run / per-token values. */
export function formatFine(value: number, currency: string = DEFAULT_CURRENCY): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    }).format(value ?? 0);
}

/** "$3.00 / 1M" — display rate labels compactly. */
export function formatRate(value: number, currency: string = DEFAULT_CURRENCY): string {
    return `${formatMoney(value, currency)} / 1M`;
}

export function percentOf(part: number, whole: number): string {
    if (!whole) return '0';
    return ((part / whole) * 100).toFixed(1);
}

function symbolFor(currency: string): string {
    switch (currency) {
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        case 'GBP':
            return '£';
        default:
            return `${currency} `;
    }
}

export const DEFAULT_CURRENCY = 'USD';

export function formatMoney(value: number, currency: string = DEFAULT_CURRENCY): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value ?? 0);
}

export function compactMoney(value: number, currency: string = DEFAULT_CURRENCY): string {
    const symbol = symbolFor(currency);
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${symbol}${(value / 1_000).toFixed(1)}K`;
    if (abs >= 100) return `${symbol}${value.toFixed(0)}`;
    return `${symbol}${value.toFixed(2)}`;
}

export function percentOf(part: number, whole: number): string {
    if (!whole) return '0';
    return ((part / whole) * 100).toFixed(1);
}

export function formatInt(value: number): string {
    return new Intl.NumberFormat('en-US').format(value ?? 0);
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

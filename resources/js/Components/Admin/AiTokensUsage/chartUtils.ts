export function formatNum(n: number): string {
    return n.toLocaleString('en-US');
}

export function compactNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

export function niceCeil(value: number): number {
    if (value <= 0) return 1;
    const exp = Math.floor(Math.log10(value));
    const pow = Math.pow(10, exp);
    const n = value / pow;
    const rounded = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return rounded * pow;
}

export function percentOf(part: number, whole: number): number {
    if (whole === 0) return 0;
    return Math.round((part / whole) * 100);
}

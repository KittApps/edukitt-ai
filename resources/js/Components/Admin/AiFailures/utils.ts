export function formatInt(value: number): string {
    return new Intl.NumberFormat('en-US').format(value ?? 0);
}

export function compactInt(value: number): string {
    const v = value ?? 0;
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toString();
}

export function formatPercent(value: number): string {
    const v = value ?? 0;
    return `${v.toFixed(2)}%`;
}

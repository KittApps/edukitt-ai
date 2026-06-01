export type Period = 'day' | 'week' | 'month' | 'year';

export interface Summary {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    generation_count: number;
    avg_tokens_per_run: number;
}

export interface TimeseriesPoint {
    date: string;
    input: number;
    output: number;
}

export interface ContentTypeRow {
    key: string;
    label: string;
    input: number;
    output: number;
    runs: number;
}

export interface ProviderRow {
    provider: string;
    model: string;
    input: number;
    output: number;
    runs: number;
}

export interface TopUserRow {
    name: string;
    email: string;
    tokens: number;
    runs: number;
}

export const PERIOD_OPTIONS: Array<{ key: Period; label: string }> = [
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
];

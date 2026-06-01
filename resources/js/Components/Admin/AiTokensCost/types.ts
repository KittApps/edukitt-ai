export type Period = 'day' | 'week' | 'month' | 'year';

export interface Summary {
    total_cost: number;
    input_cost: number;
    output_cost: number;
    generation_count: number;
    avg_cost_per_run: number;
    currency: string;
}

export interface TimeseriesPoint {
    date: string;
    input: number;
    output: number;
}

export interface ContentTypeRow {
    key: string;
    label: string;
    input_cost: number;
    output_cost: number;
    runs: number;
}

export interface ProviderRow {
    provider: string;
    model: string;
    input_cost: number;
    output_cost: number;
    runs: number;
    input_rate: number;
    output_rate: number;
}

export interface TopUserRow {
    name: string;
    email: string;
    cost: number;
    runs: number;
}

export const PERIOD_OPTIONS: Array<{ key: Period; label: string }> = [
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
];

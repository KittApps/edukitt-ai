export interface Summary {
    total: number;
    successful: number;
    failed: number;
    failure_rate: number;
    failed_last_24h: number;
}

export interface TimeseriesPoint {
    date: string;
    successful: number;
    failed: number;
}

export interface ErrorRow {
    id: number;
    created_at: string;
    task_type: string;
    provider_slug: string | null;
    error_class: string | null;
    error_message: string | null;
    user: {
        id: number;
        name: string | null;
        email: string | null;
    } | null;
}

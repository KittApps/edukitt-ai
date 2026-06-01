export interface Summary {
    total: number;
    subscriptions: number;
    credit_packs: number;
    transactions: number;
    avg_transaction: number;
    currency: string;
}

export interface TimeseriesPoint {
    date: string;
    subscriptions: number;
    credit_packs: number;
}

export interface PlanRow {
    plan: string;
    cycle: string;
    transactions: number;
    revenue: number;
}

export interface PackageRow {
    package: string;
    credits: number;
    transactions: number;
    revenue: number;
}

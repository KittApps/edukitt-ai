export interface DashboardSummary {
    users: {
        total: number;
        verified: number;
        new_last_30: number;
    };
    subscriptions: {
        active: number;
        paid_plans: number;
    };
    revenue: {
        total: number;
        transactions: number;
        currency: string;
    };
    ai: {
        generations_last_30: number;
        tokens_last_30: number;
    };
}

export interface RegistrationPoint {
    date: string;
    count: number;
}

export interface RecentUserRow {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    is_admin: boolean;
    created_at: string | null;
}

export interface RecentTransactionRow {
    id: string;
    type: 'subscription' | 'credit_pack';
    description: string;
    user: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
    };
    amount: number;
    currency: string;
    created_at: string | null;
}

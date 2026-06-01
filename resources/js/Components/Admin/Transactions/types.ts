export type TransactionType = 'subscription' | 'credit_pack';

/**
 * Status pills displayed in the table.
 *  - subscription invoices: `paid` | `open` | `void` | `uncollectible`
 *  - credit pack purchases: `completed` | `failed` | `pending`
 */
export type TransactionStatus =
    | 'paid'
    | 'open'
    | 'void'
    | 'uncollectible'
    | 'completed'
    | 'failed'
    | 'pending';

export interface TransactionUser {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
}

export interface Transaction {
    id: string;
    reference: string;
    user: TransactionUser;
    type: TransactionType;
    description: string;
    amount: number;
    currency: string;
    status: TransactionStatus;
    gateway: string;
    created_at: string;
}

export interface TransactionsPageMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface TransactionsPaginated {
    data: Transaction[];
    meta: TransactionsPageMeta;
}

export interface TransactionsStats {
    gross_revenue: number;
    subscriptions_revenue: number;
    /** Sum of completed credit-pack one-off purchases. */
    credit_packs_revenue: number;
    /** Count of successful paid subscription invoices + completed credit packs. */
    paid_invoices: number;
    currency: string;
}

export interface TransactionsFilters {
    type: 'all' | TransactionType;
    status: 'all' | TransactionStatus;
    q: string;
}

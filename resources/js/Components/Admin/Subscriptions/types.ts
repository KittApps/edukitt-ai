import type { SubscriptionStatus } from '@/Components/Admin/Users/types';

export type SubscriptionCycle = 'monthly' | 'yearly';

export interface SubscriptionRowUser {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
}

export interface SubscriptionRowPlan {
    id: number;
    name: string;
    slug: string;
    cycle: SubscriptionCycle;
    /** Per-cycle price (i.e. monthly_price for monthly, yearly_price for yearly). */
    unit_price: number;
    currency: string;
}

export interface SubscriptionRow {
    id: number;
    user: SubscriptionRowUser;
    plan: SubscriptionRowPlan;
    status: SubscriptionStatus;
    /** True when a Cashier `subscriptions` row backs this plan; false for admin grants. */
    is_stripe_managed: boolean;
    started_at: string | null;
    /** Renewal anchor for healthy subs; cancellation date for canceled/expired ones. */
    ends_at: string | null;
    last_payment_at: string | null;
}

export interface SubscriptionsPageMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface SubscriptionsPaginated {
    data: SubscriptionRow[];
    meta: SubscriptionsPageMeta;
}

export interface SubscriptionsStats {
    total: number;
    active: number;
    trialing: number;
    past_due: number;
    canceled: number;
    stripe_managed: number;
    mrr: number;
    currency: string;
}

export type SubscriptionsStatusFilter = 'all' | SubscriptionStatus;
export type SubscriptionsTermFilter = 'all' | SubscriptionCycle;

export interface SubscriptionsFilters {
    q: string;
    /** `'all'` or a stringified subscription_plan_id. */
    plan: string;
    status: SubscriptionsStatusFilter;
    term: SubscriptionsTermFilter;
}

export interface SubscriptionsPlanOption {
    id: number;
    name: string;
    slug: string;
}

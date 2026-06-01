export interface UserRowPlan {
    id: number;
    name: string;
    slug: string;
    is_free: boolean;
}

export interface UserRowCredits {
    used: number;
    total: number;
}

export interface UserRow {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    is_admin: boolean;
    is_active: boolean;
    email_verified_at: string | null;
    created_at: string | null;
    last_login_at: string | null;
    plan: UserRowPlan | null;
    credits: UserRowCredits | null;
    subscription_status: SubscriptionStatus;
}

export interface UsersPageMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface UsersPaginated {
    data: UserRow[];
    meta: UsersPageMeta;
}

export interface UsersStats {
    total: number;
    admins: number;
    verified: number;
    paid: number;
}

export type UsersRoleFilter = 'all' | 'admin' | 'user';
export type UsersVerifiedFilter = 'all' | 'verified' | 'unverified';
export type UsersStatusFilter = 'all' | 'active' | 'inactive';

export interface UsersFilters {
    q: string;
    role: UsersRoleFilter;
    /** `'all'` or a stringified subscription_plan_id. */
    plan: string;
    verified: UsersVerifiedFilter;
    status: UsersStatusFilter;
}

export interface PlanOption {
    id: number;
    name: string;
    slug: string;
    /** Optional fields, populated by the Create/Edit endpoints. */
    monthly_price?: number;
    yearly_price?: number;
    currency?: string;
    default_credits?: number;
    is_free: boolean;
}

export interface UserBalance {
    plan_remaining: number;
    purchased_remaining: number;
    used: number;
    total: number;
    period_starts_at: string | null;
    period_ends_at: string | null;
}

export interface EditUserPlan {
    id: number;
    name: string;
    slug: string;
    monthly_price: number;
    yearly_price: number;
    currency: string;
    default_credits: number;
    is_free: boolean;
}

export type SubscriptionStatus =
    | 'active'
    | 'trialing'
    | 'on_grace_period'
    | 'past_due'
    | 'canceled'
    | 'expired'
    | 'no_plan'
    | 'plan_disabled';

export interface EditUser {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    is_admin: boolean;
    is_active: boolean;
    email_verified: boolean;
    email_verified_at: string | null;
    created_at: string | null;
    subscription_plan_id: number | null;
    subscription_status: SubscriptionStatus;
    plan: EditUserPlan | null;
    balance: UserBalance;
}

/** Shape submitted on the Basics + Subscription combined Save (Edit). */
export interface UpdateUserPayload {
    name: string;
    email: string;
    is_admin: boolean;
    is_active: boolean;
    email_verified: boolean;
    subscription_plan_id: number | null;
    period_starts_at: string | null;
    period_ends_at: string | null;
}

/** Shape submitted on the Create form. */
export interface StoreUserPayload {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    is_admin: boolean;
    is_active: boolean;
    email_verified: boolean;
    subscription_plan_id: number | null;
}

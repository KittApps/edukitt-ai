export interface PlanFeature {
    text: string;
    included: boolean;
    highlight?: boolean;
}

export interface SubscriptionPlan {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    monthly_price: number;
    yearly_price: number;
    currency: string;
    credits_per_month: number;
    is_current: boolean;
    is_popular: boolean;
    is_free: boolean;
    cta_label: string;
    features: PlanFeature[];
    has_stripe_monthly: boolean;
    has_stripe_yearly: boolean;
}

export type SubscriptionStatus =
    | 'active'
    | 'trialing'
    | 'canceled'
    | 'past_due'
    | 'inactive'
    | 'free';

export interface CurrentPlan {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    status: SubscriptionStatus;
    billing_cycle: 'monthly' | 'yearly' | null;
    renews_at: string | null;
}

export interface CreditBalance {
    used: number;
    plan_remaining: number;
    purchased_remaining: number;
    total: number;
    period_start: string | null;
    resets_at: string | null;
}

export interface CreditPack {
    id: number;
    slug: string;
    name: string;
    credits: number;
    price: number;
    currency: string;
    per_credit: number;
    badge: 'popular' | 'best' | null;
    has_stripe_price: boolean;
}

/**
 * One day on the Usage stacked-area chart. The `date` field is the
 * ISO `YYYY-MM-DD` key, every other key is a `task_type` slug whose
 * value is the credits spent on that task that day. Missing days are
 * filled server-side with zeros for ALL task types so the x-axis is
 * continuous.
 */
export interface UsageChartPoint {
    date: string;
    [taskType: string]: number | string;
}

export interface UsageChartPeriod {
    start: string;
    end: string;
    label: string;
    prev: string;
    next: string;
}

export interface UsageChartPayload {
    period: UsageChartPeriod;
    taskTypes: string[];
    taskLabels: Record<string, string>;
    series: UsageChartPoint[];
    totals: Record<string, number>;
    totalCredits: number;
}

export interface UsageData {
    period_start: string | null;
    period_end: string | null;
    total_used: number;
    chart: UsageChartPayload;
}

export interface StripeContext {
    configured: boolean;
    has_paid_subscription: boolean;
}

export interface ExpiredBanner {
    previous_plan: string | null;
}

export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionTab = 'plans' | 'credits' | 'usage';

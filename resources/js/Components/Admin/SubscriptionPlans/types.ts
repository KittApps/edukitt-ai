export interface PlanFeature {
    text: string;
    included: boolean;
    highlight?: boolean;
}

export interface PlanLimits {
    [featureKey: string]: number;
}

export interface PlanStripe {
    monthly_price_id: string | null;
    yearly_price_id: string | null;
    /** True when both monthly and yearly Stripe Price IDs are filled in. */
    linked: boolean;
}

export interface Plan {
    id: number | null;
    name: string;
    slug: string;
    tagline: string;
    description: string;
    monthly_price: number;
    yearly_price: number;
    currency: string;
    is_active: boolean;
    is_popular: boolean;
    is_default: boolean;
    sort_order: number;
    cta_label: string;
    default_credits: number;
    rollover_unused_credits: boolean;
    limits: PlanLimits;
    features: PlanFeature[];
    stripe: PlanStripe;
    subscriber_count: number;
}

export interface FeatureCatalogEntry {
    key: string;
    label: string;
    /** '/ month', 'MB', or 'toggle' for boolean-style limits. */
    unit: string;
    default: number;
}

export interface PlansStats {
    plans_total: number;
    plans_active: number;
    subscribers_total: number;
    mrr: number;
}

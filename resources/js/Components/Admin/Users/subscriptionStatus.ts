import type { SubscriptionStatus } from './types';

/**
 * Tailwind classes + i18n key for each subscription status pill.
 *
 * Shared by the Edit page Subscription pane (where it renders as a
 * coloured pill) and the Users list table (where the label text is
 * shown plain under the plan badge). Centralising the labels keeps
 * both surfaces in lock-step when statuses are added or renamed.
 */
export const SUBSCRIPTION_STATUS_STYLES: Record<
    SubscriptionStatus,
    { classes: string; labelKey: string; fallback: string }
> = {
    active: {
        classes: 'text-emerald-600 bg-emerald-500/10',
        labelKey: 'admin.users.form.subscription.status.active',
        fallback: 'Active',
    },
    trialing: {
        classes: 'text-indigo-600 bg-indigo-500/10',
        labelKey: 'admin.users.form.subscription.status.trialing',
        fallback: 'Trialing',
    },
    on_grace_period: {
        classes: 'text-amber-700 bg-amber-500/10',
        labelKey: 'admin.users.form.subscription.status.on_grace_period',
        fallback: 'On grace period',
    },
    past_due: {
        classes: 'text-amber-700 bg-amber-500/10',
        labelKey: 'admin.users.form.subscription.status.past_due',
        fallback: 'Past due',
    },
    canceled: {
        classes: 'text-red-600 bg-red-500/10',
        labelKey: 'admin.users.form.subscription.status.canceled',
        fallback: 'Canceled',
    },
    expired: {
        classes: 'text-red-600 bg-red-500/10',
        labelKey: 'admin.users.form.subscription.status.expired',
        fallback: 'Expired',
    },
    no_plan: {
        classes: 'text-on-surface-variant bg-surface-container',
        labelKey: 'admin.users.form.subscription.status.no_plan',
        fallback: 'No plan',
    },
    plan_disabled: {
        classes: 'text-red-600 border border-red-300 bg-transparent',
        labelKey: 'admin.users.form.subscription.status.plan_disabled',
        fallback: 'Plan disabled',
    },
};

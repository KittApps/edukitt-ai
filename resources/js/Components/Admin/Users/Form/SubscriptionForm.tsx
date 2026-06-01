import { CreditCard, Info } from 'lucide-react';

import { FormCard, FormField } from '@/Components/Admin/SubscriptionPlans';
import { useT } from '@/lib/i18n';
import { useCurrency } from '@/lib/settings';
import { SUBSCRIPTION_STATUS_STYLES } from '../subscriptionStatus';
import type { PlanOption, SubscriptionStatus } from '../types';

export interface SubscriptionState {
    subscription_plan_id: number | null;
    /** ISO date strings (`YYYY-MM-DD`) or empty. Both editable on Edit, read-only on Create. */
    period_starts_at: string;
    period_ends_at: string;
}

interface Props {
    mode: 'create' | 'edit';
    value: SubscriptionState;
    plans: PlanOption[];
    /**
     * Server-resolved subscription status. Edit-page only; omitted on
     * Create where the user / balance don't exist yet.
     */
    status?: SubscriptionStatus;
    onChange: <K extends keyof SubscriptionState>(
        field: K,
        val: SubscriptionState[K],
    ) => void;
    errors?: Partial<Record<keyof SubscriptionState, string>>;
}

export default function SubscriptionForm({
    mode,
    value,
    plans,
    status,
    onChange,
    errors,
}: Props) {
    const t = useT();
    const currency = useCurrency();

    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    const selected =
        value.subscription_plan_id !== null
            ? plans.find((p) => p.id === value.subscription_plan_id) ?? null
            : null;

    const fmtMoney = (v: number) =>
        currency.format(v, {
            maximumFractionDigits: 0,
            zeroAs: t('admin.users.form.subscription.free', 'Free'),
        });

    return (
        <div className="space-y-6">
            <FormCard
                title={t('admin.users.form.subscription.title', 'Subscription')}
                description={t(
                    'admin.users.form.subscription.description',
                    'Manually assign or change this user\u2019s plan. Stripe is not involved \u2014 use this for free-plan grants, comp accounts, or manual fixes.',
                )}
                icon={<CreditCard size={16} className="text-primary" />}
            >
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface mb-5">
                    <Info size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                    <p className="min-w-0 text-xs text-on-surface-variant leading-relaxed">
                        {t(
                            'admin.users.form.subscription.info',
                            'This is a manual override. The user\u2019s Stripe subscription (if any) is not modified \u2014 changes here only affect the local plan assignment and credit allotment.',
                        )}
                    </p>
                </div>

                <FormField
                    label={t('admin.users.form.subscription.plan', 'Subscription plan')}
                    htmlFor="user-plan"
                >
                    <select
                        id="user-plan"
                        value={value.subscription_plan_id ?? ''}
                        onChange={(e) =>
                            onChange(
                                'subscription_plan_id',
                                e.target.value === '' ? null : Number(e.target.value),
                            )
                        }
                        className={inputClasses}
                    >
                        <option value="">
                            {t(
                                'admin.users.form.subscription.no_plan',
                                'No plan / Free',
                            )}
                        </option>
                        {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name}
                                {plan.is_free
                                    ? ` \u00b7 ${t(
                                          'admin.users.form.subscription.free_suffix',
                                          'Free',
                                      )}`
                                    : ''}
                            </option>
                        ))}
                    </select>
                    {errors?.subscription_plan_id && (
                        <p className="text-xs text-red-600 mt-1">
                            {errors.subscription_plan_id}
                        </p>
                    )}
                </FormField>

                {selected !== null && (
                    <div
                        className={`mt-4 rounded-xl border border-surface-container bg-surface-container-low/40 px-4 py-3 grid grid-cols-1 gap-4 ${
                            mode === 'edit' && status
                                ? 'sm:grid-cols-4'
                                : 'sm:grid-cols-3'
                        }`}
                    >
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                {t(
                                    'admin.users.form.subscription.summary.plan',
                                    'Plan',
                                )}
                            </p>
                            <p className="text-sm font-bold text-on-surface mt-1 truncate">
                                {selected.name}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                {t(
                                    'admin.users.form.subscription.summary.monthly',
                                    'Monthly',
                                )}
                            </p>
                            <p className="text-sm font-bold text-on-surface mt-1 tabular-nums">
                                {fmtMoney(selected.monthly_price ?? 0)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                {t(
                                    'admin.users.form.subscription.summary.credits',
                                    'Credits / month',
                                )}
                            </p>
                            <p className="text-sm font-bold text-on-surface mt-1 tabular-nums">
                                {(selected.default_credits ?? 0).toLocaleString()}
                            </p>
                        </div>
                        {mode === 'edit' && status && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    {t(
                                        'admin.users.form.subscription.summary.status',
                                        'Status',
                                    )}
                                </p>
                                <span
                                    className={`mt-1 inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${SUBSCRIPTION_STATUS_STYLES[status].classes}`}
                                >
                                    {t(
                                        SUBSCRIPTION_STATUS_STYLES[status].labelKey,
                                        SUBSCRIPTION_STATUS_STYLES[status].fallback,
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'edit' && status && selected === null && (
                    <div className="mt-4 rounded-xl border border-surface-container bg-surface-container-low/40 px-4 py-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {t(
                                'admin.users.form.subscription.summary.status',
                                'Status',
                            )}
                        </p>
                        <span
                            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${SUBSCRIPTION_STATUS_STYLES[status].classes}`}
                        >
                            {t(
                                SUBSCRIPTION_STATUS_STYLES[status].labelKey,
                                SUBSCRIPTION_STATUS_STYLES[status].fallback,
                            )}
                        </span>
                    </div>
                )}
            </FormCard>

            <FormCard
                title={t(
                    'admin.users.form.subscription.period.title',
                    'Credit period',
                )}
                description={
                    mode === 'create'
                        ? t(
                              'admin.users.form.subscription.period.description_create',
                              'On Create the period is initialised from "now" for one month. Adjust it after the user is created if you need a different window.',
                          )
                        : t(
                              'admin.users.form.subscription.period.description_edit',
                              'Optional manual override. Use this to extend an expired user\u2019s access or backdate the start of their current period.',
                          )
                }
                icon={<CreditCard size={16} className="text-secondary" />}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        label={t(
                            'admin.users.form.subscription.period.start',
                            'Period starts at',
                        )}
                        htmlFor="user-period-start"
                    >
                        <input
                            id="user-period-start"
                            type="date"
                            disabled={mode === 'create'}
                            value={value.period_starts_at}
                            onChange={(e) =>
                                onChange('period_starts_at', e.target.value)
                            }
                            className={`${inputClasses} ${
                                mode === 'create' ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                        />
                        {errors?.period_starts_at && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.period_starts_at}
                            </p>
                        )}
                    </FormField>
                    <FormField
                        label={t(
                            'admin.users.form.subscription.period.end',
                            'Period ends at',
                        )}
                        htmlFor="user-period-end"
                    >
                        <input
                            id="user-period-end"
                            type="date"
                            disabled={mode === 'create'}
                            value={value.period_ends_at}
                            onChange={(e) =>
                                onChange('period_ends_at', e.target.value)
                            }
                            className={`${inputClasses} ${
                                mode === 'create' ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                        />
                        {errors?.period_ends_at && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.period_ends_at}
                            </p>
                        )}
                    </FormField>
                </div>
            </FormCard>
        </div>
    );
}

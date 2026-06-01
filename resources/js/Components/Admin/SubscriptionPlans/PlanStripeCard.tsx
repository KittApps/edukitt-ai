import { CreditCard } from 'lucide-react';
import FormCard from './FormCard';
import FormField from './FormField';
import type { Plan, PlanStripe } from './types';

interface Props {
    plan: Plan;
    onChange: <K extends keyof PlanStripe>(field: K, value: PlanStripe[K]) => void;
}

/**
 * Manual Stripe wiring. The operator pastes Price IDs from the Stripe
 * Dashboard; the app never calls the Stripe API to create or update
 * Products/Prices. A plan is considered "linked" once both monthly and
 * yearly Price IDs are filled in.
 */
export default function PlanStripeCard({ plan, onChange }: Props) {
    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    return (
        <FormCard
            title="Stripe"
            description="Paste Price IDs from the Stripe Dashboard. Both fields are optional; leave them blank for free plans."
            icon={<CreditCard size={16} className="text-on-surface-variant" />}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    label="Monthly Stripe Price ID"
                    htmlFor="plan-stripe-monthly"
                    hint="Recurring price billed monthly (e.g. price_1AbCdE...)."
                >
                    <input
                        id="plan-stripe-monthly"
                        type="text"
                        value={plan.stripe.monthly_price_id ?? ''}
                        onChange={(e) =>
                            onChange('monthly_price_id', e.target.value.trim() || null)
                        }
                        placeholder="price_xxx"
                        className={inputClasses}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </FormField>
                <FormField
                    label="Yearly Stripe Price ID"
                    htmlFor="plan-stripe-yearly"
                    hint="Recurring price billed yearly (e.g. price_1AbCdE...)."
                >
                    <input
                        id="plan-stripe-yearly"
                        type="text"
                        value={plan.stripe.yearly_price_id ?? ''}
                        onChange={(e) =>
                            onChange('yearly_price_id', e.target.value.trim() || null)
                        }
                        placeholder="price_xxx"
                        className={inputClasses}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </FormField>
            </div>

            <p className="text-[11px] text-on-surface-variant mt-5 leading-relaxed">
                Subscription cycles, retries and dunning are handled by Stripe. We never
                push plan metadata to Stripe — make sure the Price IDs above match the
                product configured in your Stripe Dashboard.
            </p>
        </FormCard>
    );
}

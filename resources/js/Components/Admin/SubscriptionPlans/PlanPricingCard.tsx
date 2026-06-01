import { DollarSign } from 'lucide-react';
import { useCurrency } from '@/lib/settings';
import FormCard from './FormCard';
import FormField from './FormField';
import type { Plan } from './types';

interface Props {
    plan: Plan;
    onChange: <K extends keyof Plan>(field: K, value: Plan[K]) => void;
}

export default function PlanPricingCard({ plan, onChange }: Props) {
    const currency = useCurrency();

    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    const yearlySavings =
        plan.monthly_price > 0 && plan.yearly_price > 0
            ? Math.round((1 - plan.yearly_price / (plan.monthly_price * 12)) * 100)
            : 0;

    return (
        <FormCard
            title="Pricing"
            description="Set in the display currency configured in Billing settings. Stripe charge currency is managed inside Stripe."
            icon={<DollarSign size={16} className="text-secondary" />}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Monthly price" htmlFor="plan-monthly" hint="Use 0 for free plans.">
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                            {currency.symbol}
                        </span>
                        <input
                            id="plan-monthly"
                            type="number"
                            min={0}
                            step="0.01"
                            value={plan.monthly_price}
                            onChange={(e) => onChange('monthly_price', Number(e.target.value))}
                            className={`${inputClasses} pl-9`}
                        />
                    </div>
                </FormField>
                <FormField
                    label="Yearly price"
                    htmlFor="plan-yearly"
                    hint={
                        yearlySavings > 0
                            ? `That's a ${yearlySavings}% saving vs monthly.`
                            : 'Total amount billed once per year.'
                    }
                >
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                            {currency.symbol}
                        </span>
                        <input
                            id="plan-yearly"
                            type="number"
                            min={0}
                            step="0.01"
                            value={plan.yearly_price}
                            onChange={(e) => onChange('yearly_price', Number(e.target.value))}
                            className={`${inputClasses} pl-9`}
                        />
                    </div>
                </FormField>
            </div>
        </FormCard>
    );
}

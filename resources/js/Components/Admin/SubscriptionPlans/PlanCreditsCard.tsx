import { Sparkles } from 'lucide-react';
import FormCard from './FormCard';
import FormField from './FormField';
import Toggle from './Toggle';
import type { Plan } from './types';

interface Props {
    plan: Plan;
    onChange: <K extends keyof Plan>(field: K, value: Plan[K]) => void;
    creditRateUsd: number;
}

function formatUsd(value: number): string {
    if (value >= 1) {
        return `$${value.toFixed(2)}`;
    }
    if (value >= 0.01) {
        return `$${value.toFixed(3)}`;
    }
    return `$${value.toFixed(5)}`;
}

/**
 * Plan → Credits tab. Configures how many credits the plan grants per
 * period and whether unused credits roll over to the next period.
 *
 * Rollover only applies to plan-granted credits. Purchased credit
 * packs never expire and are not affected by this toggle.
 */
export default function PlanCreditsCard({ plan, onChange, creditRateUsd }: Props) {
    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    const usdEquivalent = (plan.default_credits || 0) * (creditRateUsd || 0);

    return (
        <FormCard
            title="Credits"
            description="How many AI credits this plan grants per month."
            icon={<Sparkles size={16} className="text-primary" />}
        >
            <div className="space-y-5">
                <FormField
                    label="Default credits per month"
                    htmlFor="plan-default-credits"
                    hint="Each month a user on this plan receives this many credits."
                >
                    <input
                        id="plan-default-credits"
                        type="number"
                        min={0}
                        step="1"
                        value={plan.default_credits}
                        onChange={(e) => onChange('default_credits', Number(e.target.value))}
                        className={inputClasses}
                    />
                    {creditRateUsd > 0 && (
                        <p className="text-[11px] text-on-surface-variant mt-1.5">
                            Approx. cost value:{' '}
                            <span className="font-semibold text-on-surface">
                                {formatUsd(usdEquivalent)} USD
                            </span>
                            <span className="text-on-surface-variant/70">
                                {' '}· at {formatUsd(creditRateUsd)} / credit
                            </span>
                        </p>
                    )}
                </FormField>

                <FormField
                    label="Roll over unused credits"
                    htmlFor="plan-rollover"
                    hint="When ON, unused plan credits carry into the next period instead of resetting. Does not affect purchased credit packs."
                    inline
                >
                    <Toggle
                        id="plan-rollover"
                        checked={plan.rollover_unused_credits}
                        onChange={(v) => onChange('rollover_unused_credits', v)}
                    />
                </FormField>
            </div>
        </FormCard>
    );
}

import { Gauge, Infinity as InfinityIcon } from 'lucide-react';
import FormCard from './FormCard';
import Toggle from './Toggle';
import type { FeatureCatalogEntry, Plan } from './types';

interface Props {
    plan: Plan;
    catalog: FeatureCatalogEntry[];
    onChange: (key: string, value: number) => void;
}

/**
 * Renders one row per metered feature. Numeric features have a value
 * input plus an "Unlimited" pill that toggles -1. Toggle features
 * render a switch that maps to 0/1.
 */
export default function PlanLimitsCard({ plan, catalog, onChange }: Props) {
    return (
        <FormCard
            title="Feature limits"
            description="What this plan can do per billing cycle. Use Unlimited where there should be no cap."
            icon={<Gauge size={16} className="text-tertiary" />}
        >
            <div className="divide-y divide-surface-container -my-3">
                {catalog.map((entry) => {
                    const value = plan.limits[entry.key] ?? 0;

                    if (entry.unit === 'toggle') {
                        return (
                            <div
                                key={entry.key}
                                className="flex items-center justify-between gap-4 py-4"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-on-surface">
                                        {entry.label}
                                    </p>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                        {value === 1 ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                                <Toggle
                                    checked={value === 1}
                                    onChange={(v) => onChange(entry.key, v ? 1 : 0)}
                                />
                            </div>
                        );
                    }

                    const isUnlimited = value === -1;

                    return (
                        <div
                            key={entry.key}
                            className="flex items-center justify-between gap-4 py-4"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface">
                                    {entry.label}
                                </p>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                    {entry.unit}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {!isUnlimited && (
                                    <input
                                        type="number"
                                        min={0}
                                        value={value}
                                        onChange={(e) =>
                                            onChange(entry.key, Number(e.target.value))
                                        }
                                        className="w-24 bg-surface-container-low/60 border border-surface-container rounded-xl px-3 py-2 text-sm text-on-surface text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={() => onChange(entry.key, isUnlimited ? entry.default : -1)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                        isUnlimited
                                            ? 'bg-primary text-white'
                                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                                    }`}
                                >
                                    <InfinityIcon size={12} />
                                    Unlimited
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </FormCard>
    );
}

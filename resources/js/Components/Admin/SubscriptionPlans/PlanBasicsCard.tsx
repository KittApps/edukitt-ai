import { FileText } from 'lucide-react';
import FormCard from './FormCard';
import FormField from './FormField';
import Toggle from './Toggle';
import type { Plan } from './types';

interface Props {
    plan: Plan;
    onChange: <K extends keyof Plan>(field: K, value: Plan[K]) => void;
}

export default function PlanBasicsCard({ plan, onChange }: Props) {
    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    return (
        <FormCard
            title="Basics"
            description="Name and description shown to users on the subscription page."
            icon={<FileText size={16} className="text-primary" />}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <FormField label="Plan name" htmlFor="plan-name">
                        <input
                            id="plan-name"
                            type="text"
                            value={plan.name}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder="Pro"
                            className={inputClasses}
                        />
                    </FormField>
                </div>
                <FormField label="Sort order" htmlFor="plan-sort" hint="Lower numbers appear first.">
                    <input
                        id="plan-sort"
                        type="number"
                        value={plan.sort_order}
                        onChange={(e) => onChange('sort_order', Number(e.target.value))}
                        className={inputClasses}
                    />
                </FormField>
                <div className="md:col-span-3">
                    <FormField label="Tagline" htmlFor="plan-tagline" hint="One short line that appears under the plan name.">
                        <input
                            id="plan-tagline"
                            type="text"
                            value={plan.tagline}
                            onChange={(e) => onChange('tagline', e.target.value)}
                            placeholder="For serious learners who want more"
                            className={inputClasses}
                        />
                    </FormField>
                </div>
                <div className="md:col-span-3">
                    <FormField label="Description" htmlFor="plan-description" hint="Internal-facing notes. Not shown to users by default.">
                        <textarea
                            id="plan-description"
                            value={plan.description}
                            onChange={(e) => onChange('description', e.target.value)}
                            rows={2}
                            className={inputClasses}
                            placeholder="Higher monthly limits with advanced models and certificates..."
                        />
                    </FormField>
                </div>
            </div>

            <div className="mt-5 border-t border-surface-container pt-2">
                <FormField label="Active" hint="Inactive plans are hidden from users." inline>
                    <Toggle checked={plan.is_active} onChange={(v) => onChange('is_active', v)} />
                </FormField>
                <FormField
                    label="Mark as popular"
                    hint="Shows the highlighted 'Most Popular' ribbon."
                    inline
                >
                    <Toggle
                        checked={plan.is_popular}
                        onChange={(v) => onChange('is_popular', v)}
                    />
                </FormField>
                <FormField
                    label="Default plan"
                    hint="New users will be assigned to this plan automatically."
                    inline
                >
                    <Toggle
                        checked={plan.is_default}
                        onChange={(v) => onChange('is_default', v)}
                    />
                </FormField>
            </div>
        </FormCard>
    );
}

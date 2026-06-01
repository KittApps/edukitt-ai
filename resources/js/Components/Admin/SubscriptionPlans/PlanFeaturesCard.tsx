import { ListChecks, Plus, Trash2, Star } from 'lucide-react';
import FormCard from './FormCard';
import Toggle from './Toggle';
import type { Plan, PlanFeature } from './types';

interface Props {
    plan: Plan;
    onChange: (features: PlanFeature[]) => void;
}

/**
 * Free-form bullet list shown on the user-facing plan card. This is
 * intentionally separate from the limits matrix — limits are enforced
 * by the backend, this list is purely marketing copy.
 */
export default function PlanFeaturesCard({ plan, onChange }: Props) {
    const update = (idx: number, field: keyof PlanFeature, value: PlanFeature[keyof PlanFeature]) => {
        const next = [...plan.features];
        next[idx] = { ...next[idx], [field]: value };
        onChange(next);
    };

    const add = () => {
        onChange([...plan.features, { text: '', included: true }]);
    };

    const remove = (idx: number) => {
        onChange(plan.features.filter((_, i) => i !== idx));
    };

    return (
        <FormCard
            title="Display features"
            description="Bullet points shown on the public plan card. Mark items as included or struck-through."
            icon={<ListChecks size={16} className="text-secondary" />}
            actions={
                <button
                    type="button"
                    onClick={add}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                    <Plus size={13} /> Add feature
                </button>
            }
        >
            <div className="space-y-2">
                {plan.features.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-4">
                        No features yet. Click "Add feature" to start.
                    </p>
                )}
                {plan.features.map((f, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-2 bg-surface-container-low/40 rounded-xl p-2 pl-3 border border-transparent hover:border-surface-container transition-colors"
                    >
                        <Toggle
                            checked={f.included}
                            onChange={(v) => update(idx, 'included', v)}
                        />
                        <input
                            type="text"
                            value={f.text}
                            onChange={(e) => update(idx, 'text', e.target.value)}
                            placeholder="e.g. Advanced AI models"
                            className="flex-1 bg-transparent border-0 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none px-2"
                        />
                        <button
                            type="button"
                            onClick={() => update(idx, 'highlight', !f.highlight)}
                            title={f.highlight ? 'Highlighted' : 'Highlight this feature'}
                            className={`p-2 rounded-lg transition-colors ${
                                f.highlight
                                    ? 'text-primary bg-primary/10'
                                    : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'
                            }`}
                        >
                            <Star size={13} fill={f.highlight ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>
        </FormCard>
    );
}

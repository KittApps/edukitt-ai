import PlanRow from './PlanRow';
import type { Plan } from './types';

interface Props {
    plans: Plan[];
    onDelete: (plan: Plan) => void;
    onMakeDefault?: (plan: Plan) => void;
}

export default function PlansTable({ plans, onDelete, onMakeDefault }: Props) {
    if (plans.length === 0) {
        return (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center text-sm text-on-surface-variant">
                No plans yet. Create your first plan to get started.
            </div>
        );
    }

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-surface-container bg-surface-container-low/40">
                            <th className="px-4 py-3">Plan</th>
                            <th className="px-4 py-3 text-right">Monthly</th>
                            <th className="px-4 py-3 text-right">Yearly</th>
                            <th className="px-4 py-3 text-right">Credits</th>
                            <th className="px-4 py-3 text-right">Subscribers</th>
                            <th className="px-4 py-3">Stripe</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {plans.map((plan) => (
                            <PlanRow
                                key={plan.id ?? plan.slug}
                                plan={plan}
                                onDelete={() => onDelete(plan)}
                                onMakeDefault={
                                    onMakeDefault ? () => onMakeDefault(plan) : undefined
                                }
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

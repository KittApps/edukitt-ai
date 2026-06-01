import { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import BillingToggle from './BillingToggle';
import ConfirmPlanChangeModal from './ConfirmPlanChangeModal';
import PlanCard from './PlanCard';
import type { BillingCycle, CurrentPlan, SubscriptionPlan } from './types';
import type { PageProps } from '@/types';

interface Props {
    plans: SubscriptionPlan[];
    /**
     * The user's current plan as presented by the controller. `null`
     * means no plan / expired — every paid card reads as an upgrade
     * and the confirm modal is skipped.
     */
    currentPlan: CurrentPlan | null;
    /**
     * Whether the user has an active Stripe-backed subscription. When
     * true, any change of plan is confirmed first (the user already
     * has billing linked); when false, the click goes straight to
     * checkout (first-time paid signup).
     */
    hasPaidSubscription: boolean;
    /** Marks every card button disabled while a swap request is in flight. */
    submitting?: boolean;
    onSelectPlan?: (plan: SubscriptionPlan, cycle: BillingCycle) => void;
}

export default function PlansTab({
    plans,
    currentPlan,
    hasPaidSubscription,
    submitting = false,
    onSelectPlan,
}: Props) {
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [pending, setPending] = useState<{
        plan: SubscriptionPlan;
        cycle: BillingCycle;
    } | null>(null);

    // Surface validation errors from the swap controller (e.g. card
    // declined) inside the open modal instead of losing them behind a
    // page redirect. Cleared whenever the user opens a new modal.
    const { errors } = usePage<PageProps<{ errors: Record<string, string> }>>().props;
    const swapError = (errors?.plan as string | undefined) ?? null;

    const currentPlanRecord = useMemo(
        () =>
            currentPlan
                ? plans.find((p) => p.id === currentPlan.id) ?? null
                : null,
        [plans, currentPlan],
    );

    const handleSelect = (plan: SubscriptionPlan, cycle: BillingCycle) => {
        if (plan.is_current) return;

        // Only paid subscribers see the confirm modal. A free / no-plan
        // user clicking a paid card is a first-time signup that needs
        // to reach Stripe Checkout immediately to collect a card.
        if (hasPaidSubscription) {
            setPending({ plan, cycle });
            return;
        }

        onSelectPlan?.(plan, cycle);
    };

    const handleConfirm = () => {
        if (!pending || submitting) return;
        onSelectPlan?.(pending.plan, pending.cycle);
    };

    // Keep the modal open with the spinner while the swap request is
    // in flight; close it once Index drops `submitting` back to false,
    // UNLESS the response came back with a validation error — then we
    // hold the modal open so the user can see the message (typically
    // "card declined") and either retry or cancel. Tracks the previous
    // value so we only react to true→false transitions, not first mount.
    const prevSubmittingRef = useRef(submitting);
    useEffect(() => {
        if (prevSubmittingRef.current && !submitting && !swapError) {
            setPending(null);
        }
        prevSubmittingRef.current = submitting;
    }, [submitting, swapError]);

    return (
        <div className="space-y-8">
            <BillingToggle value={billingCycle} onChange={setBillingCycle} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan, i) => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        index={i}
                        billingCycle={billingCycle}
                        currentPlanMonthly={
                            currentPlanRecord?.monthly_price ?? null
                        }
                        disabled={submitting}
                        onSelect={(p) => handleSelect(p, billingCycle)}
                    />
                ))}
            </div>

            <ConfirmPlanChangeModal
                targetPlan={pending?.plan ?? null}
                currentPlan={currentPlanRecord}
                currentPlanName={currentPlan?.name ?? ''}
                submitting={submitting}
                error={swapError}
                onCancel={() => setPending(null)}
                onConfirm={handleConfirm}
            />
        </div>
    );
}

import { useT } from '@/lib/i18n';
import type { BillingCycle } from './types';

interface Props {
    value: BillingCycle;
    onChange: (next: BillingCycle) => void;
    yearlyDiscountLabel?: string;
}

export default function BillingToggle({
    value,
    onChange,
    yearlyDiscountLabel = '-20%',
}: Props) {
    const t = useT();
    return (
        <div className="flex justify-center">
            <div className="flex items-center bg-surface-container-low rounded-xl p-1 border border-surface-container">
                <button
                    onClick={() => onChange('monthly')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        value === 'monthly'
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    {t('subscription.cycle.monthly', 'Monthly')}
                </button>
                <button
                    onClick={() => onChange('yearly')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                        value === 'yearly'
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    {t('subscription.cycle.yearly', 'Yearly')}
                    <span className="text-[9px] font-black text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full uppercase">
                        {yearlyDiscountLabel}
                    </span>
                </button>
            </div>
        </div>
    );
}

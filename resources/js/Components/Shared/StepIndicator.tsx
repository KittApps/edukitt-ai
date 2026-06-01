import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
    steps: string[];
    currentStep: number;
    colorClass?: string;
}

export default function StepIndicator({ steps, currentStep, colorClass = 'bg-primary' }: StepIndicatorProps) {
    return (
        <div className="flex items-center gap-3 mb-10">
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;

                return (
                    <div key={step} className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isCompleted ? `${colorClass} text-white` :
                                isCurrent ? `${colorClass} text-white shadow-lg` :
                                'bg-surface-container text-on-surface-variant'
                            }`}>
                                {isCompleted ? <Check size={14} /> : index + 1}
                            </div>
                            <span className={`text-sm font-semibold hidden md:block ${
                                isCurrent ? 'text-on-surface' : 'text-on-surface-variant'
                            }`}>
                                {step}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="w-8 md:w-12 h-0.5 rounded-full overflow-hidden bg-surface-container">
                                {isCompleted && (
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        className={`h-full ${colorClass}`}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

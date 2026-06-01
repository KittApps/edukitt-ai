import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface StepDef {
    icon: LucideIcon;
    number: string;
    title: string;
    body: string;
}

function useSteps(): StepDef[] {
    const t = useT();

    return [
        {
            icon: Target,
            number: t('public.how_it_works.step_one.number', '01'),
            title: t('public.how_it_works.step_one.title', 'Pick a topic'),
            body: t(
                'public.how_it_works.step_one.body',
                'Tell the platform what you want to learn — a single concept or a full subject. Add depth, tone, and language preferences.',
            ),
        },
        {
            icon: Sparkles,
            number: t('public.how_it_works.step_two.number', '02'),
            title: t('public.how_it_works.step_two.title', 'Let AI craft it'),
            body: t(
                'public.how_it_works.step_two.body',
                'Specialized agents design an outline, write lesson content, and prepare quizzes — using the AI model you choose.',
            ),
        },
        {
            icon: BookOpen,
            number: t('public.how_it_works.step_three.number', '03'),
            title: t('public.how_it_works.step_three.title', 'Learn & track progress'),
            body: t(
                'public.how_it_works.step_three.body',
                'Work through lessons at your own pace, take quizzes, and earn a certificate when you complete a course.',
            ),
        },
    ];
}

export default function HowItWorksSection() {
    const t = useT();
    const steps = useSteps();

    return (
        <section id="how-it-works" className="py-20 md:py-28 bg-surface-container-low/40 border-y border-surface-container">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mb-14"
                >
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.18em] mb-3">
                        {t('public.how_it_works.kicker', 'How it works')}
                    </p>
                    <h2 className="font-headline font-extrabold tracking-tight text-on-surface text-3xl md:text-4xl leading-[1.1]">
                        {t('public.how_it_works.title', 'From topic to skill in three steps.')}
                    </h2>
                </motion.div>

                <ol className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 relative">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isLast = index === steps.length - 1;
                        return (
                            <motion.li
                                key={step.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.5, delay: index * 0.08 }}
                                className="relative"
                            >
                                <div className="h-full bg-surface-container-lowest rounded-2xl p-7 border border-surface-container">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="font-headline font-black text-on-surface-variant/40 text-3xl tracking-tight">
                                            {step.number}
                                        </span>
                                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                            <Icon size={20} />
                                        </div>
                                    </div>
                                    <h3 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-on-surface-variant leading-relaxed font-medium">
                                        {step.body}
                                    </p>
                                </div>

                                {!isLast && (
                                    <div
                                        aria-hidden
                                        className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest border border-surface-container text-on-surface-variant z-10"
                                    >
                                        <ArrowRight size={14} />
                                    </div>
                                )}
                            </motion.li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}

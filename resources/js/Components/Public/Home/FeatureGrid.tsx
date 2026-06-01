import { motion } from 'framer-motion';
import {
    Award,
    BookOpen,
    BrainCircuit,
    ClipboardList,
    Sparkles,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

interface FeatureDef {
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
    title: string;
    body: string;
}

function useFeatures(): FeatureDef[] {
    const t = useT();

    return [
        {
            icon: BookOpen,
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
            title: t('public.features.courses.title', 'AI-generated courses'),
            body: t(
                'public.features.courses.body',
                'Pick a topic, let the outline agent design modules and lessons, then dive in with structured content built just for you.',
            ),
        },
        {
            icon: Zap,
            iconColor: 'text-secondary',
            iconBg: 'bg-secondary/10',
            title: t('public.features.quick_learn.title', 'Quick Learns in minutes'),
            body: t(
                'public.features.quick_learn.body',
                'Need to grasp a concept fast? Generate a focused 5-10 minute explainer on any single topic and read it on the go.',
            ),
        },
        {
            icon: ClipboardList,
            iconColor: 'text-tertiary',
            iconBg: 'bg-tertiary/10',
            title: t('public.features.quizzes.title', 'Adaptive quizzes'),
            body: t(
                'public.features.quizzes.body',
                'Test what you have learned with quizzes generated from your course content — track scores and revisit weak spots.',
            ),
        },
        {
            icon: Award,
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
            title: t('public.features.certificates.title', 'Completion certificates'),
            body: t(
                'public.features.certificates.body',
                'Earn a printable certificate when you finish a course. Use your browser to print or save as PDF.',
            ),
        },
        {
            icon: BrainCircuit,
            iconColor: 'text-secondary',
            iconBg: 'bg-secondary/10',
            title: t('public.features.multi_provider.title', 'Multi-provider AI'),
            body: t(
                'public.features.multi_provider.body',
                'Run on the model that fits the job — OpenAI, Anthropic, or Google. Pro plans unlock the most advanced reasoning models.',
            ),
        },
        {
            icon: Sparkles,
            iconColor: 'text-tertiary',
            iconBg: 'bg-tertiary/10',
            title: t('public.features.personalization.title', 'Personalized learning paths'),
            body: t(
                'public.features.personalization.body',
                'Tune difficulty, depth, tone, and language. The platform tailors generated content to how you actually learn best.',
            ),
        },
    ];
}

export default function FeatureGrid() {
    const t = useT();
    const features = useFeatures();

    return (
        <section id="features" className="relative py-20 md:py-28">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mb-14"
                >
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.18em] mb-3">
                        {t('public.features.kicker', 'What you get')}
                    </p>
                    <h2 className="font-headline font-extrabold tracking-tight text-on-surface text-3xl md:text-4xl leading-[1.1]">
                        {t('public.features.title', 'Built to help you learn, fast.')}
                    </h2>
                    <p className="mt-4 text-on-surface-variant text-base leading-relaxed">
                        {t(
                            'public.features.subtitle',
                            'A single workspace for AI-built courses, bite-sized lessons, and quizzes — with the personalization and AI choice to back it up.',
                        )}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <motion.article
                                key={feature.title}
                                initial={{ opacity: 0, y: 18 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.45, delay: index * 0.05 }}
                                className="group relative overflow-hidden bg-surface-container-lowest rounded-2xl p-6 md:p-7 border border-surface-container hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all min-h-[180px]"
                            >
                                <Icon
                                    aria-hidden
                                    size={72}
                                    strokeWidth={1.25}
                                    className={`pointer-events-none absolute right-5 top-5 ${feature.iconColor} opacity-[0.12] group-hover:opacity-[0.18] transition-opacity`}
                                />
                                <div className="relative z-10 max-w-[82%] pt-2">
                                    <h3 className="font-headline font-extrabold text-lg text-on-surface tracking-tight">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-on-surface-variant leading-relaxed font-medium">
                                        {feature.body}
                                    </p>
                                </div>
                            </motion.article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

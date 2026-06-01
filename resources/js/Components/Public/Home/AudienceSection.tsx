import { motion } from 'framer-motion';
import {
    Briefcase,
    Compass,
    GraduationCap,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

interface AudienceDef {
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
    title: string;
    body: string;
}

function useAudiences(): AudienceDef[] {
    const t = useT();

    return [
        {
            icon: GraduationCap,
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
            title: t('public.audience.students.title', 'Students'),
            body: t(
                'public.audience.students.body',
                'Turn the syllabus into a private tutor. Generate revision notes, summary quick-reads, and self-test quizzes for any subject.',
            ),
        },
        {
            icon: Briefcase,
            iconColor: 'text-secondary',
            iconBg: 'bg-secondary/10',
            title: t('public.audience.professionals.title', 'Professionals upskilling'),
            body: t(
                'public.audience.professionals.body',
                'Ramp up on a new framework, tool, or domain between meetings. Get a structured course or a 5-minute Quick Learn — your call.',
            ),
        },
        {
            icon: Compass,
            iconColor: 'text-tertiary',
            iconBg: 'bg-tertiary/10',
            title: t('public.audience.curious.title', 'Curious self-learners'),
            body: t(
                'public.audience.curious.body',
                'Follow rabbit holes without losing track. Spin up a focused mini-course on any topic that catches your interest, free or paid.',
            ),
        },
        {
            icon: Users,
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
            title: t('public.audience.educators.title', 'Educators & teams'),
            body: t(
                'public.audience.educators.body',
                'Draft lesson outlines, hand-out materials, and assessment quizzes in minutes — then refine instead of writing from scratch.',
            ),
        },
    ];
}

export default function AudienceSection() {
    const t = useT();
    const audiences = useAudiences();

    return (
        <section id="audience" className="relative py-20 md:py-28">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mb-14"
                >
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.18em] mb-3">
                        {t('public.audience.kicker', "Who it's for")}
                    </p>
                    <h2 className="font-headline font-extrabold tracking-tight text-on-surface text-3xl md:text-4xl leading-[1.1]">
                        {t(
                            'public.audience.title',
                            'Made for every kind of learner.',
                        )}
                    </h2>
                    <p className="mt-4 text-on-surface-variant text-base leading-relaxed">
                        {t(
                            'public.audience.subtitle',
                            'From cramming for tomorrow to growing your career — the platform adapts to how, what, and how fast you want to learn.',
                        )}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {audiences.map((audience, index) => {
                        const Icon = audience.icon;
                        return (
                            <motion.article
                                key={audience.title}
                                initial={{ opacity: 0, y: 18 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.45, delay: index * 0.05 }}
                                className="group bg-surface-container-lowest rounded-2xl p-6 md:p-7 border border-surface-container hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all"
                            >
                                <div
                                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${audience.iconBg} ${audience.iconColor} mb-5`}
                                >
                                    <Icon size={22} />
                                </div>
                                <h3 className="font-headline font-extrabold text-lg text-on-surface tracking-tight">
                                    {audience.title}
                                </h3>
                                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed font-medium">
                                    {audience.body}
                                </p>
                            </motion.article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

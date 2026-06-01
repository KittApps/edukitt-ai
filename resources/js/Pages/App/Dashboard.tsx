import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Crown,
    BrainCircuit,
    Compass,
    ArrowRight,
    History,
    Variable,
    Microscope,
    BookOpen,
    Sparkles,
} from 'lucide-react';
import CourseCard from '@/Components/App/CourseCard';
import QuickLearnCard from '@/Components/App/QuickLearnCard';
import StatCard from '@/Components/App/StatCard';
import { useT } from '@/lib/i18n';
import type { PageProps } from '@/types';

interface BillingShared {
    credits_enabled?: boolean;
    credits?: {
        used: number;
        plan_remaining: number;
        purchased_remaining: number;
        total: number;
        remaining: number;
    };
    plan?: {
        name: string;
        is_free: boolean;
    } | null;
}

interface Props {
    recentCourses: any[];
    recentQuickLearns: any[];
    stats: {
        courses_count: number;
        quick_learns_count: number;
        quizzes_count: number;
        certificates_count: number;
    };
}

const courseIcons = [
    <BrainCircuit size={22} />,
    <Compass size={22} />,
    <BookOpen size={22} />,
    <Variable size={22} />,
];
const quickLearnIcons = [
    <History size={22} />,
    <Variable size={22} />,
    <Microscope size={22} />,
    <BookOpen size={22} />,
];
const quickLearnColors = ['text-tertiary', 'text-primary', 'text-secondary', 'text-primary'];

export default function Dashboard({ recentCourses, recentQuickLearns, stats }: Props) {
    const t = useT();
    return (
        <AppLayout>
            <Head title={t('dashboard.title', 'Dashboard')} />
            <div className="space-y-14">
                <HeroSection />
                <StatsSection stats={stats} />
                <ContinueLearningSection courses={recentCourses} />
                <QuickLearnSection quickLearns={recentQuickLearns} />
            </div>
        </AppLayout>
    );
}

function HeroSection() {
    const t = useT();
    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
            <div className="max-w-2xl">
                <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
                    {t('dashboard.hero.kicker', 'Good morning')}
                </p>
                <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight leading-[1.15]">
                    {t('dashboard.hero.greeting_prefix', 'Welcome back,')}{' '}
                    <span className="text-primary">
                        {t('dashboard.hero.greeting_you', 'there')}
                    </span>
                    .
                    <br />
                    <span className="text-on-surface-variant">
                        {t('dashboard.hero.subtitle', 'Ready to continue learning?')}
                    </span>
                </h1>
            </div>

            <PlanCard />
        </motion.section>
    );
}

function PlanCard() {
    const t = useT();
    const { props } = usePage<PageProps<{ billing?: BillingShared }>>();
    const billing = props.billing ?? {};
    const plan = billing.plan;
    const credits = billing.credits;
    const creditsEnabled = billing.credits_enabled ?? false;

    const planName =
        plan?.name ?? t('dashboard.plan.fallback_name', 'No plan');
    const isFree = plan?.is_free ?? true;

    const formattedRemaining =
        credits && creditsEnabled
            ? new Intl.NumberFormat().format(Math.max(0, credits.remaining))
            : null;

    const cta = isFree
        ? t('dashboard.plan.cta_upgrade', 'Upgrade for more')
        : t('dashboard.plan.cta_manage', 'Manage subscription');

    return (
        <Link
            href="/app/subscription"
            className="group flex items-center gap-4 bg-surface-container-lowest p-3 pr-5 rounded-2xl border border-surface-container self-start lg:self-end hover:border-primary/30 hover:shadow-sm transition-all"
        >
            <div className="bg-primary/10 p-2.5 rounded-xl">
                <Crown size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-headline font-black text-sm text-on-surface truncate">
                        {planName}
                    </span>
                    {formattedRemaining !== null && (
                        <>
                            <span className="h-1 w-1 rounded-full bg-on-surface-variant/50 flex-shrink-0" />
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                                <Sparkles size={11} />
                                {formattedRemaining}
                            </span>
                        </>
                    )}
                    <ArrowRight
                        size={14}
                        className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0"
                    />
                </div>
                <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5 uppercase tracking-wider truncate">
                    {cta}
                </p>
            </div>
        </Link>
    );
}

function StatsSection({ stats }: { stats: Props['stats'] }) {
    const t = useT();
    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
            <StatCard
                value={String(stats.courses_count || '0')}
                label={t('dashboard.stats.courses', 'Courses')}
                colorClass="text-primary"
            />
            <StatCard
                value={String(stats.quick_learns_count || '0')}
                label={t('dashboard.stats.quick_learns', 'Quick Learns')}
                colorClass="text-secondary"
            />
            <StatCard
                value={String(stats.quizzes_count || '0')}
                label={t('dashboard.stats.quizzes', 'Quizzes')}
                colorClass="text-tertiary"
            />
            <StatCard
                value={String(stats.certificates_count || '0')}
                label={t('dashboard.stats.certificates', 'Certificates')}
                colorClass="text-on-surface"
            />
        </motion.section>
    );
}

function ContinueLearningSection({ courses }: { courses: any[] }) {
    const t = useT();
    if (!courses || courses.length === 0) {
        return (
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-headline font-extrabold tracking-tight">
                        {t('dashboard.continue.title', 'Continue Learning')}
                    </h2>
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center">
                    <BookOpen size={48} className="text-surface-container mx-auto mb-4" />
                    <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
                        {t('dashboard.continue.empty.title', 'No courses yet')}
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-6">
                        {t(
                            'dashboard.continue.empty.description',
                            'Start your learning journey by creating your first AI-powered course.',
                        )}
                    </p>
                    <Link
                        href="/app/courses/create"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all"
                    >
                        {t('dashboard.continue.empty.cta', 'Create a Course')}{' '}
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-headline font-extrabold tracking-tight">
                    {t('dashboard.continue.title', 'Continue Learning')}
                </h2>
                <Link
                    href="/app/library"
                    className="flex items-center gap-2 text-primary text-sm font-bold hover:gap-3 transition-all"
                >
                    {t('dashboard.continue.view_all', 'View All')} <ArrowRight size={16} />
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.slice(0, 4).map((course, index) => (
                    <CourseCard
                        key={course.id}
                        id={course.id}
                        icon={courseIcons[index % courseIcons.length]}
                        title={course.title}
                        subtitle={course.description || t('courses.subtitle.generated', 'AI-generated course')}
                        progress={course.progress || 0}
                        color={index % 2 === 0 ? 'primary' : 'secondary'}
                        moduleInfo={t('courses.modules.count', '{count} modules', {
                            count: course.modules_count || 0,
                        })}
                    />
                ))}
            </div>
        </section>
    );
}

function QuickLearnSection({ quickLearns }: { quickLearns: any[] }) {
    const t = useT();
    if (!quickLearns || quickLearns.length === 0) {
        return null;
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-headline font-extrabold tracking-tight">
                    {t('dashboard.quick_learn.title', 'Quick Learn')}
                </h2>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                    {t('dashboard.quick_learn.kicker', '5-10 min topics')}
                </p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                {quickLearns.map((ql, index) => (
                    <QuickLearnCard
                        key={ql.id}
                        icon={quickLearnIcons[index % quickLearnIcons.length]}
                        title={ql.title}
                        duration={
                            ql.reading_time ||
                            t('quick_learns.reading_time.fallback', '5 min read')
                        }
                        colorClass={quickLearnColors[index % quickLearnColors.length]}
                    />
                ))}
            </div>
        </section>
    );
}

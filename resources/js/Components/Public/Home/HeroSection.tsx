import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    BookOpen,
    ClipboardList,
    PlayCircle,
    Sparkles,
    Zap,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useRegistrationEnabled } from '@/lib/settings';

export default function HeroSection() {
    const t = useT();
    const registrationEnabled = useRegistrationEnabled();

    return (
        <section className="relative overflow-hidden">
            <BackgroundGlow />

            <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-14 pb-20 md:pt-24 md:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="lg:col-span-7"
                >
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-[0.18em]">
                        <Sparkles size={12} />
                        {t('public.hero.kicker', 'AI-powered learning')}
                    </span>

                    <h1 className="mt-6 font-headline font-extrabold tracking-tight text-on-surface text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
                        {t('public.hero.title_lead', 'Learn anything,')}{' '}
                        <span className="text-primary">
                            {t('public.hero.title_highlight', 'crafted for you by AI.')}
                        </span>
                    </h1>

                    <p className="mt-6 text-base md:text-lg text-on-surface-variant leading-relaxed max-w-xl font-medium">
                        {t(
                            'public.hero.subtitle',
                            'Turn any topic into a structured course, a 5-minute Quick Learn, or an adaptive quiz — generated on demand with the AI model that fits the task.',
                        )}
                    </p>

                    <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                        {registrationEnabled ? (
                            <Link
                                href="/register"
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:brightness-110 transition-all active:scale-[0.97]"
                            >
                                {t('public.hero.cta.primary', 'Get started free')}
                                <ArrowRight
                                    size={16}
                                    className="transition-transform group-hover:translate-x-0.5"
                                />
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:brightness-110 transition-all active:scale-[0.97]"
                            >
                                {t('public.hero.cta.sign_in', 'Sign in')}
                                <ArrowRight
                                    size={16}
                                    className="transition-transform group-hover:translate-x-0.5"
                                />
                            </Link>
                        )}
                        <a
                            href="#features"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-surface-container-lowest text-on-surface text-sm font-bold border border-surface-container hover:border-primary/30 hover:text-primary transition-all"
                        >
                            <PlayCircle size={16} />
                            {t('public.hero.cta.secondary', 'See how it works')}
                        </a>
                    </div>

                    {registrationEnabled && (
                        <p className="mt-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                            {t(
                                'public.hero.assurance',
                                'No credit card required · 100 free credits to start',
                            )}
                        </p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.15 }}
                    className="lg:col-span-5 relative"
                >
                    <HeroVisual />
                </motion.div>
            </div>
        </section>
    );
}

function BackgroundGlow() {
    return (
        <>
            <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -left-20 h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl opacity-60"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-32 right-0 h-[360px] w-[360px] rounded-full bg-secondary/20 blur-3xl opacity-50"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            />
        </>
    );
}

interface PreviewCardConfig {
    icon: typeof BookOpen;
    tag: string;
    title: string;
    subtitle: string;
    accent: 'primary' | 'secondary' | 'tertiary';
    offsetClass: string;
    rotateClass: string;
    delay: number;
}

function usePreviewCards(): PreviewCardConfig[] {
    const t = useT();

    return [
        {
            icon: BookOpen,
            tag: t('public.hero.preview.tag.course', 'Course'),
            title: t('public.hero.preview.course.title', 'Intro to Astrophysics'),
            subtitle: t('public.hero.preview.course.subtitle', '6 modules · 24 lessons'),
            accent: 'primary',
            offsetClass: 'top-0 left-0',
            rotateClass: '-rotate-3',
            delay: 0,
        },
        {
            icon: Zap,
            tag: t('public.hero.preview.tag.quick_learn', 'Quick Learn'),
            title: t('public.hero.preview.quick_learn.title', 'How black holes form'),
            subtitle: t('public.hero.preview.quick_learn.subtitle', '5 min Quick Learn'),
            accent: 'secondary',
            offsetClass: 'top-20 left-10 md:left-16',
            rotateClass: 'rotate-2',
            delay: 0.1,
        },
        {
            icon: ClipboardList,
            tag: t('public.hero.preview.tag.quiz', 'Quiz'),
            title: t('public.hero.preview.quiz.title', 'Test your knowledge'),
            subtitle: t('public.hero.preview.quiz.subtitle', '10 adaptive questions'),
            accent: 'tertiary',
            offsetClass: 'top-40 left-4 md:left-8',
            rotateClass: '-rotate-1',
            delay: 0.2,
        },
    ];
}

const accentClasses: Record<PreviewCardConfig['accent'], { bg: string; text: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    secondary: { bg: 'bg-secondary/10', text: 'text-secondary' },
    tertiary: { bg: 'bg-tertiary/10', text: 'text-tertiary' },
};

function HeroVisual() {
    const previewCards = usePreviewCards();

    return (
        <div className="relative mx-auto h-[360px] sm:h-[400px] w-full max-w-md">
            {previewCards.map((card) => {
                const Icon = card.icon;
                const accent = accentClasses[card.accent];
                return (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 + card.delay, ease: 'easeOut' }}
                        className={`absolute ${card.offsetClass} w-[78%] sm:w-[80%]`}
                    >
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                                duration: 6 + card.delay * 4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: card.delay,
                            }}
                            className={`rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xl shadow-primary/5 p-5 ${card.rotateClass}`}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2.5 rounded-xl ${accent.bg} ${accent.text}`}>
                                    <Icon size={18} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${accent.text}`}>
                                    {card.tag}
                                </span>
                            </div>
                            <h4 className="font-headline font-extrabold text-base text-on-surface leading-snug">
                                {card.title}
                            </h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-1">
                                {card.subtitle}
                            </p>
                            <div className="mt-4 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${
                                        card.accent === 'primary'
                                            ? 'bg-primary'
                                            : card.accent === 'secondary'
                                              ? 'bg-secondary'
                                              : 'bg-tertiary'
                                    }`}
                                    style={{
                                        width:
                                            card.accent === 'primary'
                                                ? '68%'
                                                : card.accent === 'secondary'
                                                  ? '40%'
                                                  : '85%',
                                    }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>
    );
}

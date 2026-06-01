import { type ReactNode, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import PublicHeader from '@/Components/Public/PublicHeader';
import BrandMark from '@/Components/Shared/BrandMark';
import { useLocale, useT } from '@/lib/i18n';

export interface AuthBrandBullet {
    key: string;
    fallback: string;
}

interface AuthLayoutProps {
    children: ReactNode;
    promoEyebrowKey?: string;
    promoEyebrowFallback?: string;
    promoHeadlineKey: string;
    promoHeadlineFallback: string;
    promoBodyKey: string;
    promoBodyFallback: string;
    bullets?: AuthBrandBullet[];
}

const defaultBullets: AuthBrandBullet[] = [
    { key: 'auth.layout.bullets.courses', fallback: 'AI-generated courses tailored to your goals' },
    { key: 'auth.layout.bullets.quick_learn', fallback: '5-minute Quick Learns on any topic' },
    { key: 'auth.layout.bullets.quizzes', fallback: 'Adaptive quizzes that track what you know' },
];

export default function AuthLayout({
    children,
    promoEyebrowKey,
    promoEyebrowFallback,
    promoHeadlineKey,
    promoHeadlineFallback,
    promoBodyKey,
    promoBodyFallback,
    bullets = defaultBullets,
}: AuthLayoutProps) {
    const t = useT();
    const locale = useLocale();

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.dir = locale.direction;
        document.documentElement.lang = locale.code;
    }, [locale.direction, locale.code]);

    const eyebrow = promoEyebrowKey
        ? t(promoEyebrowKey, promoEyebrowFallback ?? 'EduKitt')
        : t('auth.layout.eyebrow', 'AI-powered learning');

    return (
        <div className="min-h-screen bg-surface text-on-surface flex flex-col">
            <div className="lg:hidden">
                <PublicHeader />
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
                <BrandPanel
                    eyebrow={eyebrow}
                    headline={t(promoHeadlineKey, promoHeadlineFallback)}
                    body={t(promoBodyKey, promoBodyFallback)}
                    bullets={bullets.map((b) => t(b.key, b.fallback))}
                />

                <main className="relative flex flex-col items-center justify-center px-6 sm:px-10 py-12 lg:py-16">
                    <div className="w-full">{children}</div>

                    <p className="mt-10 text-[11px] font-semibold text-on-surface-variant/70 uppercase tracking-[0.16em]">
                        {t('auth.layout.footnote', 'Secure · Encrypted in transit')}
                    </p>
                </main>
            </div>
        </div>
    );
}

interface BrandPanelProps {
    eyebrow: string;
    headline: string;
    body: string;
    bullets: string[];
}

function BrandPanel({ eyebrow, headline, body, bullets }: BrandPanelProps) {
    const t = useT();

    return (
        <aside
            aria-hidden={false}
            className="relative hidden lg:flex overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-container text-white"
        >
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-white/15 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute bottom-[-120px] right-[-100px] h-[440px] w-[440px] rounded-full bg-secondary-container/40 blur-3xl"
            />
            <Sparkles
                aria-hidden
                size={260}
                strokeWidth={0.9}
                className="pointer-events-none absolute -right-10 top-32 text-white/10"
            />

            <div className="relative z-10 flex flex-col w-full px-12 xl:px-16 py-14">
                <Link href="/" className="inline-flex items-center self-start" aria-label={t('public.header.brand_alt', 'EduKitt home')}>
                    <BrandMark
                        height={40}
                        alt={t('public.header.brand_alt', 'EduKitt')}
                        invert
                        textClassName="text-white"
                    />
                </Link>

                <div className="flex-1 flex flex-col justify-center max-w-xl">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-black uppercase tracking-[0.18em]"
                    >
                        <Sparkles size={12} />
                        {eyebrow}
                    </motion.span>

                    <motion.h2
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.05 }}
                        className="mt-6 font-headline font-extrabold tracking-tight text-4xl xl:text-5xl leading-[1.05]"
                    >
                        {headline}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.1 }}
                        className="mt-5 text-white/85 text-base xl:text-lg leading-relaxed font-medium max-w-md"
                    >
                        {body}
                    </motion.p>

                    {bullets.length > 0 && (
                        <motion.ul
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.18 }}
                            className="mt-10 space-y-3.5 max-w-md"
                        >
                            {bullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur text-white">
                                        <Check size={14} strokeWidth={3} />
                                    </span>
                                    <span className="text-sm xl:text-[15px] text-white/90 font-medium leading-relaxed">
                                        {bullet}
                                    </span>
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </div>

                <p className="text-xs font-semibold text-white/60 tracking-wide">
                    {t(
                        'auth.layout.brand_footer',
                        '© {year} EduKitt — your AI learning workspace.',
                        { year: new Date().getFullYear() },
                    )}
                </p>
            </div>
        </aside>
    );
}

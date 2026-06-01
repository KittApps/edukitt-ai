import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useRegistrationEnabled } from '@/lib/settings';

export default function CtaBannerSection() {
    const t = useT();
    const registrationEnabled = useRegistrationEnabled();

    // When sign-ups are closed the banner's "Create your free account"
    // pitch no longer makes sense — hide the whole section so the
    // marketing surface doesn't dangle a broken promise.
    if (!registrationEnabled) {
        return null;
    }

    return (
        <section className="py-16 md:py-20">
            <div className="max-w-6xl mx-auto px-6 md:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-container text-white"
                >
                    <Sparkles
                        aria-hidden
                        size={220}
                        strokeWidth={1}
                        className="pointer-events-none absolute -right-10 -top-10 text-white/10"
                    />

                    <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10 px-6 md:px-10 py-7 md:py-8">
                        <div className="hidden md:flex items-center pr-8 border-r border-white/20">
                            <span className="font-headline font-black tracking-tight text-5xl text-white/85 leading-none">
                                {t('public.cta_banner.accent', 'Free')}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="font-headline font-extrabold text-xl md:text-2xl tracking-tight leading-tight">
                                {t(
                                    'public.cta_banner.title',
                                    'Your next favorite course is one prompt away.',
                                )}
                            </h2>
                            <p className="mt-1 text-white/80 text-sm leading-relaxed font-medium">
                                {t(
                                    'public.cta_banner.body',
                                    'Create your free account and generate your first course in under a minute.',
                                )}
                            </p>
                        </div>

                        <Link
                            href="/register"
                            className="group shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-primary text-sm font-black shadow-lg shadow-black/15 hover:shadow-black/25 hover:bg-white/95 transition-all active:scale-[0.97] whitespace-nowrap"
                        >
                            {t('public.cta_banner.cta', 'Start learning')}
                            <ArrowRight
                                size={16}
                                className="transition-transform group-hover:translate-x-0.5"
                            />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

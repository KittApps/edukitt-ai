import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useState } from 'react';
import { Award, Lock, Sparkles, ExternalLink } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useCertificateGate } from '@/lib/settings';

export type CourseCertificateState = 'in_progress' | 'ready' | 'earned';

export interface CourseCertificateInfo {
    status: CourseCertificateState;
    id: number | null;
}

interface Props {
    courseId: number;
    certificate: CourseCertificateInfo;
}

/**
 * Sidebar card on the Course Show page that surfaces the current cert
 * state for this user-course pair:
 *   - in_progress → quiet info card, no CTA
 *   - ready       → primary "Claim" CTA, POSTs to the issue endpoint
 *   - earned      → secondary "View Certificate" link
 *
 * Mirrors the location + pattern of {@link ModuleQuizCard}.
 */
export default function CourseCertificateCard({ courseId, certificate }: Props) {
    const t = useT();
    const gate = useCertificateGate();
    const [isClaiming, setIsClaiming] = useState(false);

    if (!gate.enabled) {
        return null;
    }

    if (!gate.plan_allows) {
        return (
            <Wrapper accent="muted">
                <Header
                    icon={<Lock size={20} strokeWidth={1.75} />}
                    iconBg="bg-primary/10 text-primary"
                    kicker={t(
                        'courses.show.certificate.locked.kicker',
                        'Pro Feature',
                    )}
                    kickerClass="text-primary"
                    title={t(
                        'courses.show.certificate.locked.title',
                        'Certificates are a Pro feature',
                    )}
                    description={t(
                        'courses.show.certificate.locked.description',
                        'Upgrade your plan to earn shareable certificates when you complete a course.',
                    )}
                />
                <Link
                    href="/app/subscription"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 mt-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white text-xs font-bold shadow-md shadow-primary/20 hover:brightness-110 transition-all"
                >
                    <Sparkles size={13} />
                    {t(
                        'courses.show.certificate.locked.cta',
                        'Upgrade to unlock',
                    )}
                </Link>
            </Wrapper>
        );
    }

    const handleClaim = async () => {
        if (isClaiming) return;
        setIsClaiming(true);
        try {
            const response = await axios.post(
                `/app/courses/${courseId}/certificate/issue`,
            );
            if (response.data?.redirect) {
                window.location.href = response.data.redirect;
                return;
            }
            window.location.reload();
        } catch (error) {
            console.error('Failed to claim certificate:', error);
            setIsClaiming(false);
        }
    };

    if (certificate.status === 'earned' && certificate.id) {
        return (
            <Wrapper accent="primary">
                <Header
                    icon={<Award size={20} />}
                    iconBg="bg-primary/15 text-primary"
                    kicker={t(
                        'courses.show.certificate.earned.kicker',
                        'Certificate Earned',
                    )}
                    kickerClass="text-primary"
                    title={t(
                        'courses.show.certificate.earned.title',
                        'You earned this certificate',
                    )}
                    description={t(
                        'courses.show.certificate.earned.description',
                        'Print from your browser or save as PDF anytime from your certificate page.',
                    )}
                />
                <Link
                    href={`/app/certificates/${certificate.id}`}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 mt-3 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition-all"
                >
                    <ExternalLink size={13} />
                    {t(
                        'courses.show.certificate.earned.cta',
                        'View Certificate',
                    )}
                </Link>
            </Wrapper>
        );
    }

    if (certificate.status === 'ready') {
        return (
            <Wrapper accent="secondary">
                <Header
                    icon={<Sparkles size={20} />}
                    iconBg="bg-secondary/15 text-secondary"
                    kicker={t(
                        'courses.show.certificate.ready.kicker',
                        'Ready to Claim',
                    )}
                    kickerClass="text-secondary"
                    title={t(
                        'courses.show.certificate.ready.title',
                        'Your certificate is ready',
                    )}
                    description={t(
                        'courses.show.certificate.ready.description',
                        'You\u2019ve completed the course. Claim your certificate to make it official.',
                    )}
                />
                <motion.button
                    type="button"
                    onClick={handleClaim}
                    disabled={isClaiming}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 mt-3 rounded-xl bg-gradient-to-r from-secondary to-secondary-container text-white text-xs font-bold shadow-md shadow-secondary/20 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isClaiming ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('courses.show.certificate.claiming', 'Claiming...')}
                        </>
                    ) : (
                        <>
                            <Award size={13} />
                            {t(
                                'courses.show.certificate.ready.cta',
                                'Claim Your Certificate',
                            )}
                        </>
                    )}
                </motion.button>
            </Wrapper>
        );
    }

    return (
        <Wrapper accent="muted">
            <Header
                icon={<Award size={20} strokeWidth={1.5} />}
                iconBg="bg-surface-container text-outline-variant border-2 border-dashed border-outline-variant/40"
                kicker={t(
                    'courses.show.certificate.in_progress.kicker',
                    'Certificate',
                )}
                kickerClass="text-on-surface-variant"
                title={t(
                    'courses.show.certificate.in_progress.title',
                    'Earn your certificate',
                )}
                description={t(
                    'courses.show.certificate.in_progress.description',
                    'Complete every lesson to unlock your certificate.',
                )}
            />
        </Wrapper>
    );
}

function Wrapper({
    accent,
    children,
}: {
    accent: 'primary' | 'secondary' | 'muted';
    children: React.ReactNode;
}) {
    const cls =
        accent === 'primary'
            ? 'from-primary/8 to-primary/4 border-primary/15'
            : accent === 'secondary'
              ? 'from-secondary/8 to-secondary/4 border-secondary/15'
              : 'from-surface-container-low to-transparent border-surface-container';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl bg-gradient-to-br ${cls} border p-5`}
        >
            {children}
        </motion.div>
    );
}

function Header({
    icon,
    iconBg,
    kicker,
    kickerClass,
    title,
    description,
}: {
    icon: React.ReactNode;
    iconBg: string;
    kicker: string;
    kickerClass: string;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
            >
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${kickerClass}`}>
                    {kicker}
                </div>
                <h4 className="font-headline font-bold text-on-surface leading-snug">
                    {title}
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}

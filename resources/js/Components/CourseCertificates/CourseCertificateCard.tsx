import { motion } from 'framer-motion';
import { Link } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    Award,
    Clock,
    ExternalLink,
    Printer,
    Share2,
    Sparkles,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { CourseCertificate } from './types';

interface Props {
    certificate: CourseCertificate;
    index: number;
}

export default function CourseCertificateCard({ certificate, index }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`group bg-surface-container-lowest rounded-2xl border transition-all duration-300 overflow-hidden ${
                certificate.status === 'ready'
                    ? 'border-secondary/30 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/10'
                    : 'border-surface-container hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5'
            }`}
        >
            {certificate.status === 'earned' ? (
                <EarnedView certificate={certificate} />
            ) : certificate.status === 'ready' ? (
                <ReadyView certificate={certificate} />
            ) : (
                <InProgressView certificate={certificate} />
            )}
        </motion.div>
    );
}

function DifficultyPill({ difficulty }: { difficulty: string | null }) {
    if (!difficulty) return null;
    return (
        <span className="inline-flex items-center px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-md capitalize tracking-wide">
            {difficulty}
        </span>
    );
}

function EarnedView({ certificate }: { certificate: CourseCertificate }) {
    const t = useT();

    return (
        <>
            <div className="relative bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-6 pb-5">
                <div className="absolute top-4 right-4 opacity-[0.04] pointer-events-none">
                    <Award size={80} />
                </div>

                <div className="flex items-start gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                        <Award size={26} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-headline font-bold text-on-surface text-lg leading-snug">
                            {certificate.course_name}
                        </h3>
                        <p className="text-sm text-on-surface-variant mt-2">
                            {t(
                                'course_certificates.card.issued_on',
                                'Issued {date}',
                                { date: certificate.issue_date },
                            )}
                        </p>
                        {(certificate.difficulty || certificate.completion_time) && (
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2">
                                <DifficultyPill difficulty={certificate.difficulty} />
                                {certificate.completion_time && (
                                    <span className="inline-flex items-center gap-1.5 text-on-surface-variant text-xs font-medium">
                                        <Clock size={13} />
                                        {certificate.completion_time}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 pb-5 pt-4 space-y-4">
                <div className="flex items-center gap-2 pt-1">
                    <Link
                        href={`/app/certificates/${certificate.id}?print=1`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-primary bg-primary/8 hover:bg-primary/12 transition-all"
                    >
                        <Printer size={14} />
                        {t('course_certificates.card.print', 'Print')}
                    </Link>
                    <button
                        type="button"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-all"
                    >
                        <Share2 size={14} />
                        {t('course_certificates.card.share', 'Share')}
                    </button>
                    <Link
                        href={`/app/certificates/${certificate.id}`}
                        title={t('course_certificates.card.open', 'Open certificate')}
                        aria-label={t('course_certificates.card.open', 'Open certificate')}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-all"
                    >
                        <ExternalLink size={14} />
                    </Link>
                </div>
            </div>
        </>
    );
}

function ReadyView({ certificate }: { certificate: CourseCertificate }) {
    const t = useT();
    const [isClaiming, setIsClaiming] = useState(false);

    const handleClaim = async () => {
        if (isClaiming) return;
        setIsClaiming(true);
        try {
            const response = await axios.post(
                `/app/courses/${certificate.course_id}/certificate/issue`,
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

    return (
        <div className="relative bg-gradient-to-br from-secondary/8 via-secondary/[0.03] to-transparent p-6 space-y-4">
            <div className="absolute top-4 right-4 opacity-[0.06] pointer-events-none">
                <Award size={80} />
            </div>

            <div className="flex items-start gap-4 relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center shadow-lg shadow-secondary/20 flex-shrink-0">
                    <Sparkles size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={11} className="text-secondary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {t(
                                'course_certificates.card.ready_kicker',
                                'Ready to Claim',
                            )}
                        </span>
                    </div>
                    <h3 className="font-headline font-bold text-on-surface text-lg leading-snug">
                        {certificate.course_name}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                        {t(
                            'course_certificates.card.ready_body',
                            'You\u2019ve completed the course. Claim your certificate to make it official.',
                        )}
                    </p>
                    <div className="mt-2">
                        <DifficultyPill difficulty={certificate.difficulty} />
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-secondary to-secondary-container shadow-md shadow-secondary/20 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isClaiming ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('course_certificates.card.claiming', 'Claiming...')}
                    </>
                ) : (
                    <>
                        <Award size={15} />
                        {t(
                            'course_certificates.card.claim',
                            'Claim Certificate',
                        )}
                    </>
                )}
            </button>
        </div>
    );
}

function InProgressView({ certificate }: { certificate: CourseCertificate }) {
    const t = useT();
    const progress = certificate.progress ?? 0;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center flex-shrink-0 border-2 border-dashed border-outline-variant/40">
                    <Award size={26} className="text-outline-variant" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-headline font-bold text-on-surface text-lg leading-snug">
                        {certificate.course_name}
                    </h3>
                    <DifficultyPill difficulty={certificate.difficulty} />
                    <p className="text-sm text-on-surface-variant mt-2">
                        {t(
                            'course_certificates.card.complete_to_earn',
                            'Complete the course to earn this certificate',
                        )}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    <span>{t('course_certificates.card.progress', 'Progress')}</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-primary/40 rounded-full"
                    />
                </div>
            </div>

            <Link
                href={`/app/courses/${certificate.course_id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-primary bg-primary/8 hover:bg-primary/12 transition-all"
            >
                {t('course_certificates.card.continue_course', 'Continue Course')}
            </Link>
        </div>
    );
}

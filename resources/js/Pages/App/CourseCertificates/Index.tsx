import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Award } from 'lucide-react';
import { useT } from '@/lib/i18n';
import CourseCertificateCard from '@/Components/CourseCertificates/CourseCertificateCard';
import type { CourseCertificate } from '@/Components/CourseCertificates/types';

interface CertificateBuckets {
    earned: CourseCertificate[];
    ready: CourseCertificate[];
    in_progress: CourseCertificate[];
}

interface Props {
    certificates: CertificateBuckets;
}

type Tab = 'earned' | 'ready' | 'in_progress';

export default function Index({ certificates }: Props) {
    const t = useT();

    const earned = certificates.earned;
    const ready = certificates.ready;
    const inProgress = certificates.in_progress;

    const totalCount = earned.length + ready.length + inProgress.length;
    const isEmpty = totalCount === 0;

    const [tab, setTab] = useState<Tab>(
        ready.length > 0 ? 'ready' : 'earned',
    );

    const displayed =
        tab === 'earned' ? earned : tab === 'ready' ? ready : inProgress;

    return (
        <AppLayout>
            <Head title={t('course_certificates.title', 'Certificates')} />

            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-primary/8 text-primary">
                        <Award size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-headline font-extrabold text-on-surface">
                            {t('course_certificates.title', 'Certificates')}
                        </h1>
                        <p className="text-sm text-on-surface-variant">
                            {t(
                                'course_certificates.subtitle',
                                'Earn certificates by completing courses. Print or save as PDF from your browser to showcase your skills.',
                            )}
                        </p>
                    </div>
                </motion.div>

                {isEmpty ? (
                    <EmptyState />
                ) : (
                    <>
                        <div className="flex items-center gap-2 flex-wrap">
                            <TabButton
                                active={tab === 'earned'}
                                onClick={() => setTab('earned')}
                                label={t(
                                    'course_certificates.tabs.earned',
                                    'Earned ({count})',
                                    { count: earned.length },
                                )}
                            />
                            <TabButton
                                active={tab === 'ready'}
                                onClick={() => setTab('ready')}
                                accent="secondary"
                                label={t(
                                    'course_certificates.tabs.ready',
                                    'Ready to Claim ({count})',
                                    { count: ready.length },
                                )}
                            />
                            <TabButton
                                active={tab === 'in_progress'}
                                onClick={() => setTab('in_progress')}
                                label={t(
                                    'course_certificates.tabs.in_progress',
                                    'In Progress ({count})',
                                    { count: inProgress.length },
                                )}
                            />
                        </div>

                        {displayed.length === 0 ? (
                            <TabEmptyState tab={tab} />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {displayed.map((certificate, i) => (
                                    <CourseCertificateCard
                                        key={certificate.id}
                                        certificate={certificate}
                                        index={i}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function TabButton({
    active,
    onClick,
    label,
    accent,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    accent?: 'primary' | 'secondary';
}) {
    const activeClasses =
        accent === 'secondary'
            ? 'bg-secondary text-white shadow-md shadow-secondary/20'
            : 'bg-primary text-white shadow-md shadow-primary/20';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                    ? activeClasses
                    : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container hover:border-primary/20'
            }`}
        >
            {label}
        </button>
    );
}

function EmptyState() {
    const t = useT();

    return (
        <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center">
            <Award
                size={48}
                className="text-surface-container mx-auto mb-4"
            />
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
                {t(
                    'course_certificates.empty.title',
                    'No certificates yet',
                )}
            </h3>
            <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                {t(
                    'course_certificates.empty.description',
                    'Complete a course to earn your first certificate. Your achievements will appear here.',
                )}
            </p>
            <Link
                href="/app/library"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all"
            >
                {t('course_certificates.empty.cta', 'Go to My Library')}
            </Link>
        </div>
    );
}

function TabEmptyState({ tab }: { tab: Tab }) {
    const t = useT();
    const copy =
        tab === 'earned'
            ? {
                  title: t(
                      'course_certificates.tab_empty.earned.title',
                      'No earned certificates yet',
                  ),
                  body: t(
                      'course_certificates.tab_empty.earned.description',
                      'Finish a course and claim your certificate to see it here.',
                  ),
              }
            : tab === 'ready'
              ? {
                    title: t(
                        'course_certificates.tab_empty.ready.title',
                        'Nothing ready to claim',
                    ),
                    body: t(
                        'course_certificates.tab_empty.ready.description',
                        'Complete every lesson in a course to unlock its certificate.',
                    ),
                }
              : {
                    title: t(
                        'course_certificates.tab_empty.in_progress.title',
                        'No courses in progress',
                    ),
                    body: t(
                        'course_certificates.tab_empty.in_progress.description',
                        'Start a course from your library to begin earning a certificate.',
                    ),
                };

    return (
        <div className="bg-surface-container-lowest rounded-2xl p-10 border border-surface-container text-center">
            <Award
                size={36}
                className="text-surface-container mx-auto mb-3"
            />
            <h3 className="font-headline font-bold text-base text-on-surface mb-1.5">
                {copy.title}
            </h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                {copy.body}
            </p>
        </div>
    );
}

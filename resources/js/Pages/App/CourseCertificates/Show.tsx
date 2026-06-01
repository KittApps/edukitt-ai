import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, BadgeCheck, Printer } from 'lucide-react';
import { useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { useCertificateSettings } from '@/lib/settings';
import type { CourseCertificate } from '@/Components/CourseCertificates/types';

interface Props {
    certificate: CourseCertificate;
    recipient_name?: string;
}

export default function Show({ certificate, recipient_name }: Props) {
    const t = useT();
    const { url } = usePage();

    const recipient =
        (recipient_name ?? '').trim() ||
        t('course_certificates.show.recipient_fallback', 'Valued Learner');

    const formattedId =
        certificate.formatted_number ??
        formatCertificateId(certificate.id, certificate.issue_date);

    useEffect(() => {
        try {
            const search = typeof window !== 'undefined' ? window.location.search : '';
            const params = new URLSearchParams(search);
            if (params.get('print') !== '1') {
                return;
            }
            const id = window.setTimeout(() => window.print(), 400);
            return () => window.clearTimeout(id);
        } catch {
            return undefined;
        }
    }, [url]);

    return (
        <AppLayout>
            <Head title={certificate.course_name} />

            <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
                    <div className="space-y-2">
                        <Link
                            href="/app/certificates"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
                        >
                            <ArrowLeft size={16} />
                            {t(
                                'course_certificates.show.back',
                                'Back to Certificates',
                            )}
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface tracking-tight">
                            {certificate.course_name}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all shadow-md shadow-primary/20"
                        >
                            <Printer size={16} aria-hidden />
                            {t(
                                'course_certificates.show.print',
                                'Print',
                            )}
                        </button>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto w-full max-w-[960px] print:block print:max-w-full print:m-0 print:shadow-none"
                >
                    <CertificateDocument
                        certificate={certificate}
                        recipient={recipient}
                        formattedId={formattedId}
                    />
                </motion.div>
            </div>
        </AppLayout>
    );
}

function CertificateDocument({
    certificate,
    recipient,
    formattedId,
}: {
    certificate: CourseCertificate;
    recipient: string;
    formattedId: string;
}) {
    const t = useT();
    const { primary_color: accent, background_color: pageBg } =
        useCertificateSettings();

    const issuedLabel =
        certificate.issue_date && certificate.issue_date.trim().length > 0
            ? certificate.issue_date
            : t('course_certificates.show.issued_pending', '—');

    const accentMuted = hexAlpha(accent, 0.45);
    const accentWatermark = hexAlpha(accent, 0.06);
    const accentBorderSoft = hexAlpha(accent, 0.22);
    const difficultyBg = hexAlpha(accent, 0.12);

    const lum = certificateBackgroundLuminance(pageBg);
    const isLightBg = lum > 0.55;
    const textPrimary = isLightBg ? '#171717' : '#fafaf9';
    const textMuted = isLightBg ? '#57534e' : '#a8a29e';
    const textLabel = isLightBg ? '#78716c' : '#97938d';

    return (
        <div
            className="relative rounded-2xl border p-3 sm:p-5 print:shadow-none print:rounded-none print:border-0 print:p-0"
            style={{
                fontFamily: 'serif',
                backgroundColor: pageBg,
                borderColor: accentBorderSoft,
                boxShadow: `0 20px 45px -15px ${hexAlpha(accent, 0.07)}`,
            }}
        >
            <div
                className="relative border-2 rounded-xl px-6 py-10 sm:px-12 sm:py-14 md:px-16 md:py-16 overflow-hidden print:rounded-none"
                style={{ borderColor: accent }}
            >
                <div
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none print:hidden"
                    style={{ color: accentWatermark }}
                >
                    <Award size={400} strokeWidth={1} />
                </div>

                <div className="relative flex flex-col items-center text-center gap-6">
                    <img
                        src="/logo.png"
                        alt={t('course_certificates.show.brand_alt', 'EduKitt')}
                        className="h-12 sm:h-14 w-auto"
                    />

                    <div
                        className="flex items-center gap-3"
                        style={{ color: accent }}
                    >
                        <Award size={28} strokeWidth={1.5} />
                        <span
                            className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em]"
                            style={{ fontFamily: 'inherit', color: accent }}
                        >
                            {t(
                                'course_certificates.show.kicker',
                                'Certificate of Completion',
                            )}
                        </span>
                        <Award size={28} strokeWidth={1.5} />
                    </div>

                    <p
                        className="text-base sm:text-lg italic"
                        style={{ color: textMuted }}
                    >
                        {t(
                            'course_certificates.show.this_certifies',
                            'This certifies that',
                        )}
                    </p>

                    <h2
                        className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight break-words"
                        style={{ color: textPrimary }}
                    >
                        {recipient}
                    </h2>

                    <div
                        className="w-24 h-px"
                        style={{ backgroundColor: accentMuted }}
                    />

                    <p className="text-sm sm:text-base max-w-xl" style={{ color: textMuted }}>
                        {t(
                            'course_certificates.show.has_completed',
                            'has successfully completed the course',
                        )}
                    </p>

                    <div className="space-y-3 max-w-2xl">
                        <h3
                            className="text-xl sm:text-2xl md:text-3xl font-semibold leading-snug"
                            style={{ color: accent }}
                        >
                            {certificate.course_name}
                        </h3>
                        {certificate.difficulty && (
                            <div>
                                <span
                                    className="inline-flex items-center px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-md capitalize tracking-wide print:border print:border-neutral-400/70"
                                    style={{
                                        fontFamily: 'sans-serif',
                                        backgroundColor: difficultyBg,
                                        color: textMuted,
                                    }}
                                >
                                    {certificate.difficulty}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <BadgeCheck
                            size={18}
                            strokeWidth={2}
                            style={{ color: accent }}
                            className="flex-shrink-0"
                        />
                        <span
                            className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]"
                            style={{ fontFamily: 'inherit', color: textMuted }}
                        >
                            {t(
                                'course_certificates.show.issued_by',
                                'Issued by EduAI',
                            )}
                        </span>
                        <BadgeCheck
                            size={18}
                            strokeWidth={2}
                            style={{ color: accent }}
                            className="flex-shrink-0"
                        />
                    </div>

                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 w-full max-w-2xl pt-6 border-t border-solid"
                        style={{ borderTopWidth: 1, borderTopColor: accentMuted }}
                    >
                        <div className="text-center sm:text-left">
                            <p
                                className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1"
                                style={{ fontFamily: 'sans-serif', color: textLabel }}
                            >
                                {t('course_certificates.show.issued', 'Issued')}
                            </p>
                            <p className="text-sm sm:text-base font-semibold" style={{ color: textPrimary }}>
                                {issuedLabel}
                            </p>
                        </div>
                        <div className="text-center sm:text-right">
                            <p
                                className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1"
                                style={{ fontFamily: 'sans-serif', color: textLabel }}
                            >
                                {t(
                                    'course_certificates.show.certificate_id',
                                    'Certificate ID',
                                )}
                            </p>
                            <p
                                className="text-sm sm:text-base font-semibold"
                                style={{ fontFamily: 'sans-serif', color: textPrimary }}
                            >
                                {formattedId}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Approximate relative luminance [0,1] for contrast-aware body text on certificates.
 */
function certificateBackgroundLuminance(hex: string): number {
    const rgb = parseHexRgb(hex);
    if (!rgb) {
        return 1;
    }

    const lin = (channel: number): number => {
        const c = channel / 255;

        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };

    const R = lin(rgb.r);
    const G = lin(rgb.g);
    const B = lin(rgb.b);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
    const m6 = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (m6) {
        const n = Number.parseInt(m6[1], 16);

        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const m3 = /^#?([0-9a-f]{3})$/i.exec(hex.trim());
    if (m3) {
        const [, short] = m3;
        const [aStr, bStr, cStr] = short.split('');
        const expand = (ch: string): number =>
            Number.parseInt(ch + ch, 16);

        return {
            r: expand(aStr),
            g: expand(bStr),
            b: expand(cStr),
        };
    }

    return null;
}

/**
 * RGBA string from a `#rrggbb` admin color (from {@link useCertificateSettings}).
 */
function hexAlpha(hex: string, alpha: number): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) {
        return `rgba(99, 102, 241, ${alpha})`;
    }
    const n = Number.parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;

    return `rgba(${r},${g},${b},${alpha})`;
}

function formatCertificateId(id: string, issueDate: string): string {
    const numeric = id.replace(/\D/g, '');
    const padded = (numeric || '0').padStart(6, '0');

    let year = new Date().getFullYear();
    const yearMatch = issueDate.match(/\b(20\d{2})\b/);
    if (yearMatch) {
        year = Number.parseInt(yearMatch[1], 10);
    }

    return `EDU-${year}-${padded}`;
}

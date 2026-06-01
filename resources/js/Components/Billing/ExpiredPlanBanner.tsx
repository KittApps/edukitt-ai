import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { PageProps } from '@/types';

interface BillingShared {
    expired_plan?: {
        previous_plan: string | null;
    };
}

/**
 * Top-of-page banner shown when the user's previously paid plan has
 * expired. The banner is intentionally read-only — content browsing
 * still works, but the "Renew plan" CTA deep-links into the
 * Subscription page's Plans tab.
 */
export default function ExpiredPlanBanner() {
    const t = useT();
    const { props } = usePage<PageProps<{ billing?: BillingShared }>>();
    const expired = (props.billing as BillingShared | undefined)?.expired_plan;

    if (!expired) return null;

    return (
        <div className="sticky top-0 z-30 bg-red-600 text-white text-sm font-semibold md:ml-72 print:hidden">
            <div className="px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    <span className="truncate">
                        {t(
                            'billing.banner.expired',
                            'Your subscription has expired. Renew your plan to continue access.',
                        )}
                    </span>
                </div>
                <Link
                    href="/app/subscription?tab=plans"
                    className="px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-bold"
                >
                    {t('billing.banner.renew', 'Renew plan')}
                </Link>
            </div>
        </div>
    );
}

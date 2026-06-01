import { usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { PageProps } from '@/types';

interface FlashShape {
    success?: string | null;
    error?: string | null;
}

/**
 * Inline flash-banner copy shared by the Users Create / Edit pages.
 * Visual treatment matches the Settings/Queue + Settings/Email pages
 * verbatim — kept local to this folder for now since the existing
 * settings pages each declare it inline as well.
 */
export default function FlashBanner() {
    const { props } = usePage<PageProps<{ flash?: FlashShape }>>();
    const flash = props.flash ?? {};
    if (!flash.success && !flash.error) return null;

    if (flash.error) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="min-w-0 break-words">{flash.error}</p>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            <p className="min-w-0 break-words">{flash.success}</p>
        </div>
    );
}

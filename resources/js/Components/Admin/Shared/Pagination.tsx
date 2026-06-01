import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { useT } from '@/lib/i18n';

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    meta: PaginationMeta;
    onPageChange: (page: number) => void;
    /**
     * How many numbered links to show around the current page on each
     * side (default 1 → renders e.g. "4 5 [6] 7 8"). First / last are
     * always rendered separately, with ellipses for the gaps.
     */
    siblingCount?: number;
    /** Hide the "Showing X-Y of N" summary on the left. */
    hideSummary?: boolean;
    className?: string;
}

export default function Pagination({
    meta,
    onPageChange,
    siblingCount = 1,
    hideSummary = false,
    className = '',
}: Props) {
    const t = useT();

    if (meta.last_page <= 1) return null;

    const current = clamp(meta.current_page, 1, meta.last_page);
    const last = meta.last_page;
    const pages = buildPageList(current, last, siblingCount);

    const rangeStart = (current - 1) * meta.per_page + 1;
    const rangeEnd = Math.min(current * meta.per_page, meta.total);

    const go = (page: number) => {
        if (page < 1 || page > last || page === current) return;
        onPageChange(page);
    };

    return (
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 ${className}`}>
            {!hideSummary && (
                <p className="text-xs text-on-surface-variant">
                    {t(
                        'admin.shared.pagination.summary',
                        'Showing {start}–{end} of {total}',
                        {
                            start: rangeStart,
                            end: rangeEnd,
                            total: meta.total,
                        },
                    )}
                </p>
            )}

            <nav
                aria-label={t('admin.shared.pagination.aria_label', 'Pagination')}
                className="flex items-center gap-1 sm:ml-auto"
            >
                <ArrowButton
                    label={t('admin.shared.pagination.first', 'First page')}
                    icon={<ChevronsLeft size={14} />}
                    disabled={current <= 1}
                    onClick={() => go(1)}
                />
                <ArrowButton
                    label={t('admin.shared.pagination.prev', 'Previous page')}
                    icon={<ChevronLeft size={14} />}
                    disabled={current <= 1}
                    onClick={() => go(current - 1)}
                />

                {pages.map((p, idx) =>
                    p === 'ellipsis' ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="px-2 text-xs font-bold text-on-surface-variant select-none"
                            aria-hidden="true"
                        >
                            …
                        </span>
                    ) : (
                        <PageButton
                            key={p}
                            page={p}
                            isCurrent={p === current}
                            onClick={() => go(p)}
                        />
                    ),
                )}

                <ArrowButton
                    label={t('admin.shared.pagination.next', 'Next page')}
                    icon={<ChevronRight size={14} />}
                    disabled={current >= last}
                    onClick={() => go(current + 1)}
                />
                <ArrowButton
                    label={t('admin.shared.pagination.last', 'Last page')}
                    icon={<ChevronsRight size={14} />}
                    disabled={current >= last}
                    onClick={() => go(last)}
                />
            </nav>
        </div>
    );
}

function PageButton({
    page,
    isCurrent,
    onClick,
}: {
    page: number;
    isCurrent: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={`Go to page ${page}`}
            className={`min-w-[2rem] h-8 px-2 text-xs font-bold rounded-lg transition-colors ${
                isCurrent
                    ? 'bg-primary text-white shadow-sm shadow-primary/20 cursor-default'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
            }`}
        >
            {page}
        </button>
    );
}

function ArrowButton({
    label,
    icon,
    disabled,
    onClick,
}: {
    label: string;
    icon: React.ReactNode;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            title={label}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-container-low transition-colors"
        >
            {icon}
        </button>
    );
}

type PageEntry = number | 'ellipsis';

/**
 * Build the numbered page list with ellipses. Always anchors page 1
 * and `last`, surrounds `current` with `siblingCount` neighbours on
 * each side, and inserts an ellipsis whenever the gap to the next
 * shown page is greater than 1.
 */
function buildPageList(current: number, last: number, siblingCount: number): PageEntry[] {
    const totalNumbersToShow = siblingCount * 2 + 5;
    if (last <= totalNumbersToShow) {
        return range(1, last);
    }

    const leftSibling = Math.max(current - siblingCount, 1);
    const rightSibling = Math.min(current + siblingCount, last);

    const showLeftEllipsis = leftSibling > 2;
    const showRightEllipsis = rightSibling < last - 1;

    if (!showLeftEllipsis && showRightEllipsis) {
        const leftRange = range(1, 3 + siblingCount * 2);
        return [...leftRange, 'ellipsis', last];
    }

    if (showLeftEllipsis && !showRightEllipsis) {
        const rightRange = range(last - (3 + siblingCount * 2) + 1, last);
        return [1, 'ellipsis', ...rightRange];
    }

    return [1, 'ellipsis', ...range(leftSibling, rightSibling), 'ellipsis', last];
}

function range(start: number, end: number): number[] {
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
}

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, type LucideProps } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

/**
 * One row in the dropdown. Generic over `value` so callers can keep
 * their own id type (string / number / domain enum) without casting.
 *
 *  - `disabled` rows can't be selected but stay visible (with a
 *    grey-out + tooltip) so users know the option exists; the
 *    typical use is "available on a paid plan".
 *  - `badge` is a free-form ReactNode rendered to the right of the
 *    label — handy for plan crowns, "Beta" pills, etc.
 *  - `meta` is small grey text underneath the label.
 */
export interface CustomDropdownOption<TValue> {
    value: TValue;
    label: string;
    icon?: ComponentType<LucideProps>;
    badge?: ReactNode;
    meta?: ReactNode;
    disabled?: boolean;
    disabledHint?: string;
}

interface Props<TValue> {
    label?: string;
    value: TValue | null;
    options: CustomDropdownOption<TValue>[];
    onChange: (value: TValue) => void;
    placeholder?: string;
    disabled?: boolean;
    /**
     * Optional icon shown to the left of the selected label in the
     * collapsed trigger. Defaults to none — useful when every row
     * already declares its own icon.
     */
    triggerIcon?: ComponentType<LucideProps>;
    /** Tailwind class hook for the popover panel — control width / max-h. */
    panelClassName?: string;
    /**
     * Optional one-line note rendered above the options list (e.g.
     * "Paid plan members can use any model"). Use this rather than a
     * tooltip when the explanation applies to several rows.
     */
    panelHeader?: ReactNode;
}

/**
 * App-side custom dropdown used by the generation wizards.
 *
 * Built bespoke (rather than reaching for a `<select>` or a heavy
 * combobox library) because the rows need rich content — icons,
 * crown badges, "paid plan" tooltips — that native selects can't
 * render. Keyboard-accessible: arrow keys move the highlight,
 * Enter selects, Esc closes.
 *
 * Outside click closes the panel; the popover anchors below the
 * trigger and shifts above when there isn't room.
 */
export default function CustomDropdown<TValue extends string | number>({
    label,
    value,
    options,
    onChange,
    placeholder = 'Select…',
    disabled = false,
    triggerIcon: TriggerIcon,
    panelClassName,
    panelHeader,
}: Props<TValue>) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    // Popover placement: defaults to 'bottom' and flips to 'top' when there
    // isn't enough room below the trigger. Re-evaluated on open + on
    // resize/scroll so the panel never gets clipped at the viewport edge.
    const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
    // Maximum height for the options list. Computed from the available
    // viewport space so the panel always fits — falls back to the static
    // 18rem (288px) used previously when there's plenty of room.
    const [maxListHeight, setMaxListHeight] = useState<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    const selected = useMemo(
        () => options.find((o) => o.value === value) ?? null,
        [options, value],
    );

    // Close on outside click or Escape.
    useEffect(() => {
        if (!open) return;
        const onPointer = (e: PointerEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // When opening, jump highlight to the currently-selected row so
    // arrow keys move from a sensible starting point.
    useEffect(() => {
        if (!open) return;
        const idx = options.findIndex((o) => o.value === value);
        setHighlight(idx === -1 ? firstEnabled(options) : idx);
    }, [open, options, value]);

    // Decide whether the popover opens downward (default) or flips
    // upward when the trigger is near the bottom of the viewport — and
    // cap the list height so neither direction overflows the screen.
    //
    // useLayoutEffect runs after the panel has been laid out but before
    // the browser paints, so the first frame already shows the correct
    // placement (no visible jump). The listener is reattached while the
    // panel is open so scrolling the page or resizing the window keeps
    // the panel aligned with the trigger.
    useLayoutEffect(() => {
        if (!open) {
            setMaxListHeight(null);
            return;
        }

        const compute = () => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;
            const triggerRect = wrapper.getBoundingClientRect();
            const viewportH = window.innerHeight;
            // Breathing room from the viewport edge so the panel doesn't
            // kiss the screen border.
            const margin = 12;
            // Gap between trigger and panel (matches the mt-1.5 / mb-1.5
            // tailwind classes — 6px).
            const gap = 6;
            const spaceBelow = viewportH - triggerRect.bottom - gap - margin;
            const spaceAbove = triggerRect.top - gap - margin;
            // Account for the optional panel header (title row) plus the
            // list's own padding when sizing the inner scroller. The
            // panel chrome itself is roughly 0–40px depending on header.
            const panelChrome = panelHeader ? 40 : 8;
            // Preferred max for the list scroller — the original
            // hard-coded value before we started measuring.
            const preferred = 288;

            // Flip up only when the bottom truly can't host the panel
            // and the top genuinely has more room — otherwise stay down.
            const wantTop =
                spaceBelow < preferred + panelChrome &&
                spaceAbove > spaceBelow;

            const available = wantTop ? spaceAbove : spaceBelow;
            // Never collapse the list below ~120px — if both sides are
            // that tight the user will scroll inside the panel anyway.
            const listCap = Math.max(120, Math.min(preferred, available - panelChrome));

            setPlacement(wantTop ? 'top' : 'bottom');
            setMaxListHeight(listCap);
        };

        compute();
        window.addEventListener('resize', compute);
        // Capture-phase so we react to scroll inside any ancestor
        // (sticky sidebars, modals, etc.) not just the window itself.
        window.addEventListener('scroll', compute, true);
        return () => {
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
        };
    }, [open, panelHeader]);

    const move = (delta: number) => {
        setHighlight((prev) => {
            if (options.length === 0) return prev;
            let next = prev;
            for (let i = 0; i < options.length; i++) {
                next = (next + delta + options.length) % options.length;
                if (!options[next]?.disabled) return next;
            }
            return prev;
        });
    };

    const commit = (idx: number) => {
        const opt = options[idx];
        if (!opt || opt.disabled) return;
        onChange(opt.value);
        setOpen(false);
    };

    const onTriggerKey = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
        }
    };

    const onListKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            move(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            move(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            commit(highlight);
        }
    };

    const TriggerIconComp = TriggerIcon ?? selected?.icon;

    return (
        <div ref={wrapperRef} className="relative w-full">
            {label && (
                <label
                    htmlFor={`${id}-trigger`}
                    className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5"
                >
                    {label}
                </label>
            )}

            <button
                id={`${id}-trigger`}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                onKeyDown={onTriggerKey}
                className={`group/dd w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-bold transition-colors ${
                    disabled
                        ? 'opacity-50 cursor-not-allowed bg-surface-container-low border-surface-container'
                        : open
                            ? 'bg-surface-container-lowest border-tertiary/40 ring-2 ring-tertiary/15'
                            : 'bg-surface-container-low border-surface-container hover:border-tertiary/30'
                }`}
            >
                {TriggerIconComp && (
                    <span className="flex-shrink-0 text-on-surface-variant">
                        <TriggerIconComp size={16} />
                    </span>
                )}
                <span
                    className={`flex-1 min-w-0 truncate ${
                        selected ? 'text-on-surface' : 'text-on-surface-variant font-medium'
                    }`}
                >
                    {selected?.label ?? placeholder}
                </span>
                {selected?.badge && (
                    <span className="flex-shrink-0">{selected.badge}</span>
                )}
                <ChevronDown
                    size={16}
                    className={`flex-shrink-0 text-on-surface-variant transition-transform ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={panelRef}
                        // The y-offset on the opening/closing animation
                        // matches the placement direction so the panel
                        // visually "drops" from the trigger regardless
                        // of whether it expands downward or upward.
                        initial={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className={`absolute z-30 w-full rounded-xl border border-surface-container bg-surface-container-lowest shadow-xl shadow-on-surface/10 overflow-hidden ${
                            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                        } ${panelClassName ?? ''}`}
                    >
                        {panelHeader && (
                            <div className="px-3 py-2 border-b border-surface-container text-[10px] uppercase tracking-wider font-bold text-on-surface-variant bg-surface-container-low">
                                {panelHeader}
                            </div>
                        )}
                        <ul
                            ref={listRef}
                            role="listbox"
                            tabIndex={-1}
                            onKeyDown={onListKey}
                            // Inline max-height when computed so the list
                            // shrinks to fit tight viewports; otherwise
                            // fall back to the original 18rem default.
                            style={
                                maxListHeight != null
                                    ? { maxHeight: `${maxListHeight}px` }
                                    : undefined
                            }
                            className={`overflow-y-auto py-1 ${
                                maxListHeight != null ? '' : 'max-h-72'
                            }`}
                        >
                            {options.length === 0 && (
                                <li className="px-3 py-3 text-xs text-on-surface-variant text-center">
                                    No options available.
                                </li>
                            )}
                            {options.map((opt, idx) => {
                                const isSelected = opt.value === value;
                                const isHighlighted = idx === highlight;
                                const Icon = opt.icon;
                                return (
                                    <li
                                        key={String(opt.value)}
                                        role="option"
                                        aria-selected={isSelected}
                                        aria-disabled={opt.disabled || undefined}
                                        title={opt.disabled ? opt.disabledHint : undefined}
                                        onMouseEnter={() =>
                                            !opt.disabled && setHighlight(idx)
                                        }
                                        onClick={() => commit(idx)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                                            opt.disabled
                                                ? 'opacity-50 cursor-not-allowed'
                                                : isHighlighted
                                                    ? 'bg-tertiary/10 cursor-pointer'
                                                    : 'cursor-pointer hover:bg-surface-container-low'
                                        }`}
                                    >
                                        {Icon && (
                                            <span className="flex-shrink-0 text-on-surface-variant">
                                                <Icon size={15} />
                                            </span>
                                        )}
                                        <span className="flex-1 min-w-0">
                                            <span
                                                className={`block truncate ${
                                                    isSelected
                                                        ? 'font-bold text-tertiary'
                                                        : 'font-semibold text-on-surface'
                                                }`}
                                            >
                                                {opt.label}
                                            </span>
                                            {opt.meta && (
                                                <span className="block text-[11px] text-on-surface-variant truncate">
                                                    {opt.meta}
                                                </span>
                                            )}
                                        </span>
                                        {opt.badge && (
                                            <span className="flex-shrink-0">{opt.badge}</span>
                                        )}
                                        {isSelected && !opt.badge && (
                                            <Check
                                                size={14}
                                                className="flex-shrink-0 text-tertiary"
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function firstEnabled<T>(options: CustomDropdownOption<T>[]): number {
    const idx = options.findIndex((o) => !o.disabled);
    return idx === -1 ? 0 : idx;
}

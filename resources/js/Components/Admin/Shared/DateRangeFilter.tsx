import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import {
    addDays,
    endOfMonth,
    format,
    isSameDay,
    startOfMonth,
    subDays,
    subMonths,
} from 'date-fns';

export interface RangeValue {
    from: Date;
    to: Date;
}

interface Props {
    value: RangeValue;
    onApply: (range: RangeValue) => void;
    minDate?: Date;
    maxDate?: Date;
}

interface Preset {
    key: string;
    label: string;
    range: () => RangeValue;
}

function buildPresets(now: Date = new Date()): Preset[] {
    return [
        { key: 'today', label: 'Today', range: () => ({ from: now, to: now }) },
        {
            key: 'yesterday',
            label: 'Yesterday',
            range: () => {
                const y = subDays(now, 1);
                return { from: y, to: y };
            },
        },
        {
            key: 'last7',
            label: 'Last 7 Days',
            range: () => ({ from: subDays(now, 6), to: now }),
        },
        {
            key: 'last30',
            label: 'Last 30 Days',
            range: () => ({ from: subDays(now, 29), to: now }),
        },
        {
            key: 'thisMonth',
            label: 'This Month',
            range: () => ({ from: startOfMonth(now), to: endOfMonth(now) }),
        },
        {
            key: 'lastMonth',
            label: 'Last Month',
            range: () => {
                const prev = subMonths(now, 1);
                return { from: startOfMonth(prev), to: endOfMonth(prev) };
            },
        },
    ];
}

function presetMatches(preset: Preset, range: RangeValue | undefined) {
    if (!range) return false;
    const p = preset.range();
    return isSameDay(p.from, range.from) && isSameDay(p.to, range.to);
}

function formatTrigger(range: RangeValue): string {
    if (isSameDay(range.from, range.to)) {
        return format(range.from, 'MMM d, yyyy');
    }
    if (range.from.getFullYear() === range.to.getFullYear()) {
        return `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')}`;
    }
    return `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`;
}

export default function DateRangeFilter({ value, onApply, minDate, maxDate }: Props) {
    const presets = useMemo(() => buildPresets(new Date()), []);
    const [draft, setDraft] = useState<DateRange | undefined>({
        from: value.from,
        to: value.to,
    });
    const initialOpen = useRef(false);

    // Reset draft whenever the committed value changes (e.g. after apply
    // re-renders this component with new props from server).
    useEffect(() => {
        setDraft({ from: value.from, to: value.to });
    }, [value.from, value.to]);

    const activePresetKey = useMemo(() => {
        const r = draft?.from && draft?.to ? { from: draft.from, to: draft.to } : undefined;
        return presets.find((p) => presetMatches(p, r))?.key ?? 'custom';
    }, [draft, presets]);

    return (
        <Popover className="relative">
            {({ open, close }) => {
                if (!open && initialOpen.current) {
                    initialOpen.current = false;
                    setDraft({ from: value.from, to: value.to });
                }
                if (open) initialOpen.current = true;

                return (
                    <>
                        <Popover.Button
                            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors ${
                                open
                                    ? 'border-primary bg-primary/5 text-on-surface'
                                    : 'border-surface-container bg-surface-container-lowest text-on-surface hover:border-primary/30'
                            }`}
                        >
                            <Calendar size={14} className="text-primary" />
                            <span className="tabular-nums">{formatTrigger(value)}</span>
                            <ChevronDown
                                size={14}
                                className={`text-on-surface-variant transition-transform ${
                                    open ? 'rotate-180' : ''
                                }`}
                            />
                        </Popover.Button>

                        <Transition
                            enter="transition duration-150 ease-out"
                            enterFrom="opacity-0 scale-95 -translate-y-1"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="transition duration-100 ease-in"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95 -translate-y-1"
                        >
                            <Popover.Panel className="absolute right-0 z-30 mt-2 w-[540px] max-w-[95vw] rounded-2xl border border-surface-container bg-surface shadow-2xl overflow-hidden">
                                <div className="flex">
                                    <PresetSidebar
                                        presets={presets}
                                        active={activePresetKey}
                                        onSelect={(p) => {
                                            const r = p.range();
                                            setDraft({ from: r.from, to: r.to });
                                        }}
                                    />

                                    <div className="flex-1 p-2">
                                        <div className="rdp-theme">
                                            <DayPicker
                                                mode="range"
                                                selected={draft}
                                                onSelect={setDraft}
                                                numberOfMonths={2}
                                                defaultMonth={subMonths(value.from, 0)}
                                                disabled={[
                                                    ...(minDate ? [{ before: minDate }] : []),
                                                    ...(maxDate ? [{ after: maxDate }] : []),
                                                ]}
                                                weekStartsOn={1}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Footer
                                    draft={draft}
                                    onCancel={() => {
                                        setDraft({ from: value.from, to: value.to });
                                        close();
                                    }}
                                    onApply={() => {
                                        if (draft?.from && draft?.to) {
                                            onApply({ from: draft.from, to: draft.to });
                                        } else if (draft?.from) {
                                            onApply({ from: draft.from, to: draft.from });
                                        }
                                        close();
                                    }}
                                />
                            </Popover.Panel>
                        </Transition>
                    </>
                );
            }}
        </Popover>
    );
}

function PresetSidebar({
    presets,
    active,
    onSelect,
}: {
    presets: Preset[];
    active: string;
    onSelect: (p: Preset) => void;
}) {
    return (
        <div className="w-[124px] flex-shrink-0 border-r border-surface-container bg-surface-container-lowest/60 py-2.5">
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                Quick Ranges
            </p>
            <div className="space-y-0.5 px-1.5">
                {presets.map((p) => {
                    const isActive = p.key === active;
                    return (
                        <button
                            key={p.key}
                            onClick={() => onSelect(p)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                                isActive
                                    ? 'bg-primary/12 text-primary'
                                    : 'text-on-surface hover:bg-surface-container-low'
                            }`}
                        >
                            {p.label}
                        </button>
                    );
                })}
                <div
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-semibold ${
                        active === 'custom'
                            ? 'bg-tertiary/12 text-tertiary'
                            : 'text-on-surface-variant'
                    }`}
                >
                    Custom Range
                </div>
            </div>
        </div>
    );
}

function Footer({
    draft,
    onCancel,
    onApply,
}: {
    draft: DateRange | undefined;
    onCancel: () => void;
    onApply: () => void;
}) {
    const fromLabel = draft?.from ? format(draft.from, 'MMM d, yyyy') : '—';
    const toLabel = draft?.to ? format(draft.to, 'MMM d, yyyy') : '—';
    const canApply = !!(draft?.from && draft?.to);

    return (
        <div className="px-3 py-2 border-t border-surface-container bg-surface-container-lowest/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px]">
                <span className="px-2 py-1 rounded-md bg-surface-container-low text-on-surface font-semibold tabular-nums">
                    {fromLabel}
                </span>
                <span className="text-on-surface-variant">→</span>
                <span className="px-2 py-1 rounded-md bg-surface-container-low text-on-surface font-semibold tabular-nums">
                    {toLabel}
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={onCancel}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-md text-on-surface-variant hover:bg-surface-container-low"
                >
                    <X size={12} />
                    Cancel
                </button>
                <button
                    onClick={onApply}
                    disabled={!canApply}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

export function parseRangeFromQuery(
    startDate?: string | null,
    endDate?: string | null,
    fallback: RangeValue = {
        from: subDays(new Date(), 6),
        to: new Date(),
    },
): RangeValue {
    const from = startDate ? new Date(startDate + 'T00:00:00') : fallback.from;
    const to = endDate ? new Date(endDate + 'T00:00:00') : fallback.to;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return fallback;
    return { from, to };
}

export function rangeToQuery(range: RangeValue): { start_date: string; end_date: string } {
    return {
        start_date: format(range.from, 'yyyy-MM-dd'),
        end_date: format(range.to, 'yyyy-MM-dd'),
    };
}

/** Number of inclusive days in a range (used for axis sizing). */
export function rangeDays(range: RangeValue): number {
    const ms = range.to.getTime() - range.from.getTime();
    return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export { addDays };

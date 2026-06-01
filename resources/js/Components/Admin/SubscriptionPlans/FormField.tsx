import type { ReactNode } from 'react';

interface Props {
    label: string;
    hint?: string;
    children: ReactNode;
    htmlFor?: string;
    inline?: boolean;
}

export default function FormField({ label, hint, children, htmlFor, inline }: Props) {
    if (inline) {
        return (
            <label
                htmlFor={htmlFor}
                className="flex items-center justify-between gap-4 py-3 border-b border-surface-container last:border-0"
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{label}</p>
                    {hint && (
                        <p className="text-xs text-on-surface-variant mt-0.5">{hint}</p>
                    )}
                </div>
                <div className="flex-shrink-0">{children}</div>
            </label>
        );
    }
    return (
        <div className="space-y-1.5">
            <label
                htmlFor={htmlFor}
                className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block"
            >
                {label}
            </label>
            {children}
            {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
        </div>
    );
}

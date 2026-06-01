import { ReactNode } from 'react';

interface Props {
    label?: string;
    action?: ReactNode;
    children: ReactNode;
}

/**
 * Sticky left-column container for admin vertical-nav patterns.
 * Children are rendered inside a scrollable flex column.
 */
export default function NavPanel({ label, action, children }: Props) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden sticky top-24">
            {(label || action) && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container">
                    {label && (
                        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                            {label}
                        </h2>
                    )}
                    {action}
                </div>
            )}
            <nav className="p-2 space-y-1 max-h-[calc(100vh-14rem)] overflow-y-auto no-scrollbar">
                {children}
            </nav>
        </div>
    );
}

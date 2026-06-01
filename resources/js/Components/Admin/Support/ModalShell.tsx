import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
    title: string;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: string;
}

export default function ModalShell({
    title,
    onClose,
    children,
    maxWidth = 'max-w-lg',
}: Props) {
    return (
        <div
            className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className={`bg-surface-container-lowest rounded-3xl border border-surface-container ${maxWidth} w-full p-7 shadow-2xl relative`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant"
                    aria-label="Close"
                >
                    <X size={16} className="mx-auto" />
                </button>

                <h3 className="text-lg font-headline font-extrabold text-on-surface mb-5">
                    {title}
                </h3>

                {children}
            </div>
        </div>
    );
}

export const fieldClasses =
    'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

export function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                {label}
            </label>
            {children}
        </div>
    );
}

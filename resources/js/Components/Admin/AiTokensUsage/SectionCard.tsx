import type { ReactNode } from 'react';

interface Props {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    children: ReactNode;
}

export default function SectionCard({ title, subtitle, icon, children }: Props) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-container flex items-start gap-3">
                {icon && (
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <h3 className="font-headline font-bold text-on-surface text-sm">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

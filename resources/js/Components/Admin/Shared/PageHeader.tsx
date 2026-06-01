import { ReactNode } from 'react';

interface Props {
    title: string;
    description?: string;
    actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: Props) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="text-2xl font-headline font-extrabold text-on-surface">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-on-surface-variant mt-1">{description}</p>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

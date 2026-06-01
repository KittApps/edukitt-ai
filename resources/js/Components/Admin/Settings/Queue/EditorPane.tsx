import { ReactNode } from 'react';

interface Props {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
    onSubmit: (e: React.FormEvent) => void;
}

/**
 * Card wrapper for the right-side editor pane in Queue Settings.
 *
 * Mirrors the EditorPane used in Email Settings so all admin settings
 * pages share the same titled card + form-body convention.
 */
export default function EditorPane({
    icon,
    title,
    description,
    children,
    onSubmit,
}: Props) {
    return (
        <form
            onSubmit={onSubmit}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden max-w-2xl"
        >
            <div className="flex items-start gap-3 px-6 py-5 border-b border-surface-container">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h2 className="font-headline font-extrabold text-lg text-on-surface">
                        {title}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        {description}
                    </p>
                </div>
            </div>
            <div className="p-6 space-y-6">{children}</div>
        </form>
    );
}

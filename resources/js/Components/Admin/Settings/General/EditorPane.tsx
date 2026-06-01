import { ReactNode } from 'react';

interface Props {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
    onSubmit?: (e: React.FormEvent) => void;
}

/**
 * Card wrapper for the right-side editor pane in General Settings.
 *
 * Same titled-card + form-body convention used by the Email / Queue
 * settings pages so every admin settings page shares one visual style.
 * `onSubmit` is optional so placeholder tabs (e.g. Login) can render
 * an empty body without a form wrapper.
 */
export default function EditorPane({
    icon,
    title,
    description,
    children,
    onSubmit,
}: Props) {
    const body = (
        <>
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
        </>
    );

    if (onSubmit) {
        return (
            <form
                onSubmit={onSubmit}
                className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden max-w-2xl"
            >
                {body}
            </form>
        );
    }

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden max-w-2xl">
            {body}
        </div>
    );
}

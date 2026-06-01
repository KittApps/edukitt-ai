import { Fragment, ReactNode } from 'react';

/**
 * Renders a string with inline Markdown-ish formatting, with line-break
 * and simple bullet handling at the block level.
 *
 * Supported syntax:
 *  - **bold**
 *  - *italic*
 *  - `inline code`  (also good for keyboard shortcuts, tag names, paths…)
 *  - lines starting with "- " or "•" become bullet items
 *
 * Use {@link renderInline} directly when you only need the inline pass
 * (e.g. inside list items where the surrounding container handles wrapping).
 */
export default function RichText({ content }: { content: string }) {
    const lines = content.split('\n');

    return (
        <div className="space-y-3 text-sm text-on-surface leading-relaxed">
            {lines.map((line, i) => {
                if (line.trim() === '') {
                    return null;
                }

                if (line.startsWith('•') || line.startsWith('- ')) {
                    return (
                        <div key={i} className="flex items-start gap-2.5 pl-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span>{renderInline(line.replace(/^[•-]\s*/, ''))}</span>
                        </div>
                    );
                }

                return <p key={i}>{renderInline(line)}</p>;
            })}
        </div>
    );
}

/**
 * Tokenize a single line into React nodes. Order matters: backticks are
 * checked before stars so `*not italic*` inside code stays literal.
 */
export function renderInline(text: string): ReactNode {
    const parts = text.split(/(`[^`]+`|\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return <InlineCode key={i}>{part.slice(1, -1)}</InlineCode>;
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
                <strong key={i} className="font-bold text-on-surface">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return (
                <em key={i} className="italic text-on-surface-variant">
                    {part.slice(1, -1)}
                </em>
            );
        }
        return <Fragment key={i}>{part}</Fragment>;
    });
}

function InlineCode({ children }: { children: ReactNode }) {
    return (
        <code className="font-mono text-[0.85em] px-1.5 py-0.5 mx-0.5 rounded-md bg-surface-container text-primary border border-surface-container-high/40 align-baseline">
            {children}
        </code>
    );
}

interface Props {
    text: string;
}

/**
 * Renders text with {placeholder} tokens highlighted as inline primary-colored chips.
 */
export default function HighlightedText({ text }: Props) {
    const parts = text.split(/(\{[a-zA-Z_][\w]*\})/g);
    return (
        <>
            {parts.map((part, i) =>
                /^\{[a-zA-Z_][\w]*\}$/.test(part) ? (
                    <span
                        key={i}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[11px] font-bold mx-0.5 align-middle"
                    >
                        {part}
                    </span>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </>
    );
}

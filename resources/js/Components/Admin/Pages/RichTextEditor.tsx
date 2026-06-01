import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Code,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Minus,
    Quote,
    Redo2,
    Strikethrough,
    Undo2,
    Unlink,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    error?: string;
    minHeight?: string;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start writing…',
    error,
    minHeight = '320px',
}: Props) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                codeBlock: false,
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
                    class: 'text-primary underline underline-offset-2',
                },
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        editorProps: {
            attributes: {
                class: 'tiptap focus:outline-none px-5 py-4 text-sm leading-relaxed text-on-surface min-h-[var(--rte-min-h)]',
                style: `--rte-min-h: ${minHeight}`,
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        if (value && value !== current) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
    }, [editor, value]);

    if (!editor) {
        return (
            <div
                className="bg-surface-container-low/40 border border-surface-container rounded-2xl"
                style={{ minHeight }}
            />
        );
    }

    return (
        <div>
            <div
                className={`bg-surface-container-lowest border rounded-2xl overflow-hidden transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 ${
                    error ? 'border-red-400' : 'border-surface-container'
                }`}
            >
                <Toolbar editor={editor} />
                <div className="border-t border-surface-container">
                    <EditorContent editor={editor} />
                </div>
            </div>

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            <RichTextStyles />
        </div>
    );
}

function Toolbar({ editor }: { editor: Editor }) {
    const promptForLink = useCallback(() => {
        const previous = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('URL', previous ?? 'https://');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
    }, [editor]);

    const groups = useMemo(
        () => [
            [
                {
                    icon: <Bold size={14} />,
                    label: 'Bold',
                    onClick: () => editor.chain().focus().toggleBold().run(),
                    active: editor.isActive('bold'),
                },
                {
                    icon: <Italic size={14} />,
                    label: 'Italic',
                    onClick: () => editor.chain().focus().toggleItalic().run(),
                    active: editor.isActive('italic'),
                },
                {
                    icon: <Strikethrough size={14} />,
                    label: 'Strike',
                    onClick: () => editor.chain().focus().toggleStrike().run(),
                    active: editor.isActive('strike'),
                },
                {
                    icon: <Code size={14} />,
                    label: 'Inline code',
                    onClick: () => editor.chain().focus().toggleCode().run(),
                    active: editor.isActive('code'),
                },
            ],
            [
                {
                    icon: <Heading2 size={14} />,
                    label: 'Heading 2',
                    onClick: () =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run(),
                    active: editor.isActive('heading', { level: 2 }),
                },
                {
                    icon: <Heading3 size={14} />,
                    label: 'Heading 3',
                    onClick: () =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run(),
                    active: editor.isActive('heading', { level: 3 }),
                },
            ],
            [
                {
                    icon: <List size={14} />,
                    label: 'Bullet list',
                    onClick: () => editor.chain().focus().toggleBulletList().run(),
                    active: editor.isActive('bulletList'),
                },
                {
                    icon: <ListOrdered size={14} />,
                    label: 'Numbered list',
                    onClick: () => editor.chain().focus().toggleOrderedList().run(),
                    active: editor.isActive('orderedList'),
                },
                {
                    icon: <Quote size={14} />,
                    label: 'Quote',
                    onClick: () => editor.chain().focus().toggleBlockquote().run(),
                    active: editor.isActive('blockquote'),
                },
                {
                    icon: <Minus size={14} />,
                    label: 'Divider',
                    onClick: () => editor.chain().focus().setHorizontalRule().run(),
                    active: false,
                },
            ],
            [
                {
                    icon: <LinkIcon size={14} />,
                    label: 'Add link',
                    onClick: promptForLink,
                    active: editor.isActive('link'),
                },
                {
                    icon: <Unlink size={14} />,
                    label: 'Remove link',
                    onClick: () => editor.chain().focus().unsetLink().run(),
                    active: false,
                    disabled: !editor.isActive('link'),
                },
            ],
            [
                {
                    icon: <Undo2 size={14} />,
                    label: 'Undo',
                    onClick: () => editor.chain().focus().undo().run(),
                    active: false,
                    disabled: !editor.can().undo(),
                },
                {
                    icon: <Redo2 size={14} />,
                    label: 'Redo',
                    onClick: () => editor.chain().focus().redo().run(),
                    active: false,
                    disabled: !editor.can().redo(),
                },
            ],
        ],
        [editor, promptForLink],
    );

    return (
        <div className="flex flex-wrap items-center gap-1 px-2 py-2 bg-surface-container-low/40">
            {groups.map((group, gi) => (
                <div key={gi} className="flex items-center gap-0.5">
                    {gi > 0 && (
                        <span className="mx-1 h-5 w-px bg-surface-container" />
                    )}
                    {group.map((btn) => (
                        <ToolButton key={btn.label} {...btn}>
                            {btn.icon}
                        </ToolButton>
                    ))}
                </div>
            ))}
        </div>
    );
}

function ToolButton({
    children,
    label,
    onClick,
    active,
    disabled,
}: {
    children: ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className={`p-1.5 rounded-lg transition-colors ${
                active
                    ? 'bg-primary/15 text-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    );
}

function RichTextStyles() {
    return (
        <style>{`
            .tiptap { white-space: pre-wrap; }
            .tiptap p { margin: 0 0 0.75em; }
            .tiptap p:last-child { margin-bottom: 0; }
            .tiptap h2 { font-size: 1.25rem; font-weight: 800; margin: 1.5em 0 0.5em; line-height: 1.25; }
            .tiptap h3 { font-size: 1.05rem; font-weight: 700; margin: 1.25em 0 0.4em; line-height: 1.3; }
            .tiptap ul, .tiptap ol { padding-left: 1.25rem; margin: 0 0 0.75em; }
            .tiptap ul { list-style: disc; }
            .tiptap ol { list-style: decimal; }
            .tiptap li { margin: 0.15em 0; }
            .tiptap li > p { margin: 0; }
            .tiptap blockquote {
                border-left: 3px solid var(--color-primary, #6366f1);
                padding-left: 0.85rem;
                color: var(--color-on-surface-variant, #6b7280);
                font-style: italic;
                margin: 0 0 0.75em;
            }
            .tiptap hr { border: 0; border-top: 1px solid var(--color-surface-container, #e5e7eb); margin: 1.25em 0; }
            .tiptap code {
                background: rgba(99, 102, 241, 0.1);
                padding: 0.1em 0.35em;
                border-radius: 0.35rem;
                font-size: 0.85em;
            }
            .tiptap p.is-editor-empty:first-child::before {
                color: var(--color-outline-variant, #9ca3af);
                content: attr(data-placeholder);
                float: left;
                height: 0;
                pointer-events: none;
            }
        `}</style>
    );
}

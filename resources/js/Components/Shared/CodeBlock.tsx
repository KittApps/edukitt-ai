import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';

import { useT } from '@/lib/i18n';

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('rb', ruby);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('rs', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);

const LANGUAGE_LABELS: Record<string, string> = {
    bash: 'Bash',
    sh: 'Shell',
    shell: 'Shell',
    css: 'CSS',
    go: 'Go',
    html: 'HTML',
    java: 'Java',
    javascript: 'JavaScript',
    js: 'JavaScript',
    json: 'JSON',
    jsx: 'JSX',
    markup: 'HTML',
    php: 'PHP',
    py: 'Python',
    python: 'Python',
    rb: 'Ruby',
    ruby: 'Ruby',
    rs: 'Rust',
    rust: 'Rust',
    sql: 'SQL',
    ts: 'TypeScript',
    tsx: 'TSX',
    typescript: 'TypeScript',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
};

interface Props {
    code: string;
    language?: string;
}

export default function CodeBlock({ code, language }: Props) {
    const t = useT();
    const [copied, setCopied] = useState(false);

    // Some agents send literal "\n" sequences instead of real newlines.
    // Normalize so PrismJS can produce proper line breaks.
    const normalized = normalizeNewlines(code ?? '');
    const lang = (language || 'text').toLowerCase();
    const displayLang = LANGUAGE_LABELS[lang] ?? lang.toUpperCase();

    const handleCopy = () => {
        navigator.clipboard.writeText(normalized);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-xl bg-[#1e1e2e] overflow-hidden border border-white/5">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    {displayLang}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 hover:text-white/80 transition-colors"
                    type="button"
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied
                        ? t('lessons.code.copied', 'Copied')
                        : t('lessons.code.copy', 'Copy')}
                </button>
            </div>
            <SyntaxHighlighter
                language={lang}
                style={oneDark}
                showLineNumbers={normalized.includes('\n')}
                wrapLongLines
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    fontSize: '13px',
                    lineHeight: '1.6',
                }}
                codeTagProps={{
                    style: {
                        fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    },
                }}
                lineNumberStyle={{
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: '11px',
                    paddingRight: '1rem',
                    userSelect: 'none',
                }}
            >
                {normalized}
            </SyntaxHighlighter>
        </div>
    );
}

function normalizeNewlines(value: string): string {
    if (!value.includes('\\n') || value.includes('\n')) {
        return value;
    }
    return value.replace(/\\r\\n|\\n/g, '\n').replace(/\\t/g, '\t');
}

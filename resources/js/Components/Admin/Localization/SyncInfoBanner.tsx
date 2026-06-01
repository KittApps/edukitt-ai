import { Terminal } from 'lucide-react';

export default function SyncInfoBanner() {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 flex flex-wrap items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Terminal size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface">
                    Sync keys from your codebase
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                    Run this command from your project root to auto-discover every{' '}
                    <code className="font-mono font-bold bg-surface-container-low px-1 py-0.5 rounded">
                        t(&apos;dotted.key&apos;, &apos;Source&apos;)
                    </code>{' '}
                    call. Duplicates are ignored.
                </p>
            </div>
            <code className="text-xs font-mono bg-slate-900 text-slate-100 px-3 py-2 rounded-lg whitespace-nowrap">
                php artisan locale:sync
            </code>
        </div>
    );
}

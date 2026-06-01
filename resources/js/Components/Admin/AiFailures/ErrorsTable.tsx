import { AlertTriangle } from 'lucide-react';

import type { ErrorRow } from './types';

interface Props {
    errors: ErrorRow[];
}

export default function ErrorsTable({ errors }: Props) {
    if (errors.length === 0) {
        return (
            <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={20} />
                </div>
                <p className="text-sm font-bold text-on-surface mb-1">No failures recorded</p>
                <p className="text-xs text-on-surface-variant">
                    Every AI call has succeeded so far. New failures will appear here as soon as
                    the provider gives up after retries.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-surface-container bg-surface-container-low/40">
                        <th className="px-5 py-3">When</th>
                        <th className="px-3 py-3">User</th>
                        <th className="px-3 py-3">Task</th>
                        <th className="px-3 py-3">Provider</th>
                        <th className="px-3 py-3">Error</th>
                        <th className="px-5 py-3">Message</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                    {errors.map((row) => (
                        <tr
                            key={row.id}
                            className="hover:bg-surface-container-low/40 transition-colors"
                        >
                            <td className="px-5 py-3 whitespace-nowrap text-xs text-on-surface tabular-nums">
                                {formatWhen(row.created_at)}
                            </td>
                            <td className="px-3 py-3 text-xs text-on-surface">
                                {row.user ? (
                                    <div className="flex flex-col">
                                        <span className="font-semibold truncate max-w-[160px]">
                                            {row.user.name ?? '—'}
                                        </span>
                                        <span className="text-on-surface-variant text-[11px] truncate max-w-[160px]">
                                            {row.user.email ?? ''}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-on-surface-variant italic">system</span>
                                )}
                            </td>
                            <td className="px-3 py-3 text-xs">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface font-mono">
                                    {row.task_type}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-on-surface">
                                {row.provider_slug ?? '—'}
                            </td>
                            <td className="px-3 py-3 text-xs">
                                {row.error_class ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-error/10 text-error font-mono">
                                        {shortClass(row.error_class)}
                                    </span>
                                ) : (
                                    <span className="text-on-surface-variant">—</span>
                                )}
                            </td>
                            <td className="px-5 py-3 text-xs text-on-surface-variant max-w-[420px]">
                                <span className="line-clamp-2" title={row.error_message ?? ''}>
                                    {row.error_message ?? '—'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function shortClass(full: string): string {
    const parts = full.split('\\');
    return parts[parts.length - 1] ?? full;
}

function formatWhen(iso: string | null): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

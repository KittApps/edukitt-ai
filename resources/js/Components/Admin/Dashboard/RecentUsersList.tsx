import { Link } from '@inertiajs/react';
import { Shield, Users } from 'lucide-react';

import SectionCard from '@/Components/Admin/AiTokensCost/SectionCard';

import type { RecentUserRow } from './types';

interface Props {
    users: RecentUserRow[];
}

export default function RecentUsersList({ users }: Props) {
    return (
        <SectionCard
            title="Recent Users"
            subtitle="Latest sign-ups"
            icon={<Users size={16} className="text-primary" />}
            action={
                <Link
                    href="/admin/users"
                    className="text-xs font-bold text-primary hover:underline"
                >
                    View all
                </Link>
            }
        >
            {users.length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-6">
                    No users yet.
                </p>
            ) : (
                <ul className="-mx-1 divide-y divide-surface-container">
                    {users.map((u) => (
                        <li key={u.id} className="px-1 py-2.5">
                            <Link
                                href={`/admin/users/${u.id}/edit`}
                                className="flex items-center gap-3 -mx-1 px-1 py-1 rounded-lg hover:bg-surface-container-low transition-colors"
                            >
                                <Avatar name={u.name} avatar={u.avatar} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-on-surface truncate">
                                            {u.name}
                                        </p>
                                        {u.is_admin && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                <Shield size={9} /> Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-on-surface-variant truncate">
                                        {u.email}
                                    </p>
                                </div>
                                <span className="text-[10px] text-on-surface-variant tabular-nums flex-shrink-0">
                                    {formatDate(u.created_at)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
    if (avatar) {
        return (
            <img
                src={avatar}
                alt={name}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
        );
    }
    const initial = name?.charAt(0)?.toUpperCase() ?? '?';
    return (
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initial}
        </div>
    );
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

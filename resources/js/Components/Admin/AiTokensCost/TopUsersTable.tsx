import { Wallet } from 'lucide-react';
import SectionCard from './SectionCard';
import { formatFine, formatMoney } from './costUtils';
import type { TopUserRow } from './types';

interface Props {
    users: TopUserRow[];
    currency?: string;
}

export default function TopUsersTable({ users, currency = 'USD' }: Props) {
    return (
        <SectionCard
            title="Top Users by Spend"
            subtitle="Highest AI cost contributors this period"
            icon={<Wallet size={16} className="text-tertiary" />}
        >
            <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-surface-container">
                            <th className="px-3 py-2.5">User</th>
                            <th className="px-3 py-2.5 text-right">Cost</th>
                            <th className="px-3 py-2.5 text-right">Runs</th>
                            <th className="px-3 py-2.5 text-right">Avg / Run</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {users.map((u, idx) => (
                            <tr key={u.email} className="hover:bg-surface-container-low">
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-surface-container-low border border-surface-container flex items-center justify-center text-xs font-semibold text-on-surface">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-on-surface truncate">
                                                {u.name}
                                            </p>
                                            <p className="text-xs text-on-surface-variant truncate">
                                                {u.email}
                                            </p>
                                        </div>
                                        <RankBadge rank={idx + 1} />
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-right font-headline font-bold text-on-surface tabular-nums">
                                    {formatMoney(u.cost, currency)}
                                </td>
                                <td className="px-3 py-3 text-right text-on-surface-variant tabular-nums">
                                    {u.runs}
                                </td>
                                <td className="px-3 py-3 text-right text-on-surface-variant tabular-nums">
                                    {formatFine(u.cost / Math.max(1, u.runs), currency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
}

function RankBadge({ rank }: { rank: number }) {
    const color =
        rank === 1
            ? 'bg-tertiary/15 text-tertiary'
            : rank === 2
              ? 'bg-primary/15 text-primary'
              : rank === 3
                ? 'bg-secondary/15 text-secondary'
                : 'bg-surface-container-low text-on-surface-variant';
    return (
        <span
            className={`ml-auto text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${color}`}
        >
            {rank}
        </span>
    );
}

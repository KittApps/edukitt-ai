import { Bot } from 'lucide-react';
import { StatusDot, type StatusTone } from '@/Components/Admin/Shared';
import type { Provider } from './types';

interface Props {
    provider: Provider;
    isActive: boolean;
    onSelect: () => void;
}

function getStatus(provider: Provider): { tone: StatusTone; label: string; title?: string } {
    if (!provider.is_active) return { tone: 'muted', label: 'Off' };
    if (!provider.api_key)
        return { tone: 'warning', label: 'No Key', title: 'Active but no API key set' };
    return { tone: 'success', label: 'Live' };
}

export default function ProviderNavItem({ provider, isActive, onSelect }: Props) {
    const status = getStatus(provider);

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                    ? 'bg-primary/10 border border-primary/15'
                    : 'hover:bg-surface-container-low border border-transparent'
            }`}
        >
            <div
                className={`p-2 rounded-lg flex-shrink-0 ${
                    isActive
                        ? 'bg-primary text-white'
                        : 'bg-surface-container text-on-surface-variant group-hover:text-primary'
                }`}
            >
                <Bot size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p
                    className={`text-sm font-bold truncate ${
                        isActive ? 'text-primary' : 'text-on-surface'
                    }`}
                >
                    {provider.name}
                </p>
                <p className="text-[10px] text-on-surface-variant truncate font-mono">
                    {provider.slug}
                </p>
            </div>
            <StatusDot tone={status.tone} label={status.label} title={status.title} />
        </button>
    );
}

import { useState } from 'react';
import { Bot, Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react';
import type { Model, Provider } from './types';

interface Props {
    provider: Provider;
    onUpdate: (field: keyof Provider, value: Provider[keyof Provider]) => void;
    onUpdateModel: (mi: number, f: keyof Model, v: Model[keyof Model]) => void;
    onAddModel: () => void;
    onRemoveModel: (mi: number) => void;
}

export default function ProviderEditor({
    provider,
    onUpdate,
    onUpdateModel,
    onAddModel,
    onRemoveModel,
}: Props) {
    const [showKey, setShowKey] = useState(false);

    return (
        <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                            <Bot size={22} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-headline font-extrabold text-lg text-on-surface truncate">
                                {provider.name}
                            </h2>
                            <p className="text-xs text-on-surface-variant font-mono truncate">
                                {provider.slug}
                            </p>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 bg-surface-container-low border border-surface-container rounded-xl px-3 py-2">
                        <input
                            type="checkbox"
                            checked={provider.is_active}
                            onChange={(e) => onUpdate('is_active', e.target.checked)}
                            className="w-4 h-4 text-primary rounded border-surface-container focus:ring-primary/20"
                        />
                        <span className="text-xs font-semibold text-on-surface">Active</span>
                    </label>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                        API Key
                    </label>
                    <div className="relative">
                        <KeyRound
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                        />
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={provider.api_key || ''}
                            onChange={(e) => onUpdate('api_key', e.target.value)}
                            placeholder="Enter API key..."
                            className="w-full bg-surface-container-low border border-surface-container rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                        >
                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2">
                        Keys are stored encrypted and pushed into the AI config at runtime.
                    </p>
                </div>
            </div>

            <ModelsTable
                models={provider.models}
                onUpdate={onUpdateModel}
                onAdd={onAddModel}
                onRemove={onRemoveModel}
            />
        </div>
    );
}

interface ModelsTableProps {
    models: Model[];
    onUpdate: (mi: number, f: keyof Model, v: Model[keyof Model]) => void;
    onAdd: () => void;
    onRemove: (mi: number) => void;
}

function ModelsTable({ models, onUpdate, onAdd, onRemove }: ModelsTableProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
                <div>
                    <h3 className="font-headline font-bold text-on-surface">Models</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        {models.length} configured
                    </p>
                </div>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                >
                    <Plus size={14} /> Add Model
                </button>
            </div>

            <div className="p-6">
                {models.length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-6">
                        No models configured yet. Click &quot;Add Model&quot; to create one.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-surface-container">
                                    <th className="pb-3 pr-3">Name</th>
                                    <th className="pb-3 pr-3">Model ID</th>
                                    <th className="pb-3 pr-3">Input $/1M</th>
                                    <th className="pb-3 pr-3">Output $/1M</th>
                                    <th className="pb-3 pr-3">Active</th>
                                    <th className="pb-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container">
                                {models.map((model, mi) => (
                                    <tr key={mi}>
                                        <td className="py-2.5 pr-2">
                                            <input
                                                value={model.name}
                                                onChange={(e) =>
                                                    onUpdate(mi, 'name', e.target.value)
                                                }
                                                className={cellInputCls}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-2">
                                            <input
                                                value={model.model_id}
                                                onChange={(e) =>
                                                    onUpdate(mi, 'model_id', e.target.value)
                                                }
                                                className={cellInputCls + ' font-mono'}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={model.input_price_per_million ?? ''}
                                                onChange={(e) =>
                                                    onUpdate(
                                                        mi,
                                                        'input_price_per_million',
                                                        e.target.value
                                                            ? parseFloat(e.target.value)
                                                            : null,
                                                    )
                                                }
                                                className={cellInputCls + ' w-24'}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={model.output_price_per_million ?? ''}
                                                onChange={(e) =>
                                                    onUpdate(
                                                        mi,
                                                        'output_price_per_million',
                                                        e.target.value
                                                            ? parseFloat(e.target.value)
                                                            : null,
                                                    )
                                                }
                                                className={cellInputCls + ' w-24'}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-2">
                                            <input
                                                type="checkbox"
                                                checked={model.is_active}
                                                onChange={(e) =>
                                                    onUpdate(mi, 'is_active', e.target.checked)
                                                }
                                                className="w-4 h-4 text-primary rounded"
                                            />
                                        </td>
                                        <td className="py-2.5">
                                            <button
                                                onClick={() => onRemove(mi)}
                                                className="p-1.5 text-on-surface-variant hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                                title="Remove model"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const cellInputCls =
    'w-full bg-surface-container-low border border-surface-container rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary/20 focus:border-primary/30';

import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, Coins } from 'lucide-react';

import { PageHeader } from '@/Components/Admin/Shared';
import { useCurrency } from '@/lib/settings';

export interface CreditPackage {
    id: number | null;
    name: string;
    slug: string;
    credits: number;
    price_cents: number;
    price: number;
    per_credit: number;
    currency: string;
    stripe_price_id: string | null;
    badge: 'popular' | 'best' | null;
    is_active: boolean;
    sort_order: number;
    purchases_count: number;
}

interface Props {
    packages: CreditPackage[];
    creditRateUsd: number;
}

function formatUsd(value: number): string {
    if (value >= 1) {
        return `$${value.toFixed(2)}`;
    }
    if (value >= 0.01) {
        return `$${value.toFixed(3)}`;
    }
    return `$${value.toFixed(5)}`;
}

const emptyPackage = (): CreditPackage => ({
    id: null,
    name: '',
    slug: '',
    credits: 10,
    price_cents: 200,
    price: 2,
    per_credit: 0.2,
    currency: 'USD',
    stripe_price_id: null,
    badge: null,
    is_active: true,
    sort_order: 0,
    purchases_count: 0,
});

export default function CreditPackagesIndex({ packages, creditRateUsd }: Props) {
    const [editing, setEditing] = useState<CreditPackage | null>(null);
    const [saving, setSaving] = useState(false);
    const currency = useCurrency();

    const startNew = () => setEditing(emptyPackage());
    const startEdit = (pkg: CreditPackage) => setEditing({ ...pkg });

    const update = <K extends keyof CreditPackage>(field: K, value: CreditPackage[K]) => {
        setEditing((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const updatePriceCents = (cents: number) => {
        setEditing((prev) =>
            prev
                ? {
                      ...prev,
                      price_cents: cents,
                      price: cents / 100,
                      per_credit: prev.credits > 0 ? cents / 100 / prev.credits : 0,
                  }
                : prev,
        );
    };

    const save = () => {
        if (!editing) return;
        setSaving(true);
        const payload = {
            name: editing.name,
            slug: editing.slug,
            credits: editing.credits,
            price_cents: editing.price_cents,
            currency: editing.currency,
            stripe_price_id: editing.stripe_price_id,
            badge: editing.badge,
            is_active: editing.is_active,
            sort_order: editing.sort_order,
        };
        const finished = () => {
            setSaving(false);
            setEditing(null);
        };
        if (editing.id === null) {
            router.post('/admin/credit-packages', payload, {
                onFinish: finished,
                onError: () => setSaving(false),
            });
        } else {
            router.put(`/admin/credit-packages/${editing.id}`, payload, {
                onFinish: finished,
                onError: () => setSaving(false),
            });
        }
    };

    const remove = (pkg: CreditPackage) => {
        if (pkg.id === null) return;
        if (!confirm(`Delete pack "${pkg.name}"?`)) return;
        router.delete(`/admin/credit-packages/${pkg.id}`);
    };

    return (
        <AdminLayout>
            <Head title="Credit Packages" />

            <div className="space-y-6">
                <PageHeader
                    title="Credit Packages"
                    description="One-off credit packs sold via Stripe Checkout. Purchased credits never expire."
                    actions={
                        <button
                            type="button"
                            onClick={startNew}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all"
                        >
                            <Plus size={14} /> New package
                        </button>
                    }
                />

                <div className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
                    {packages.length === 0 ? (
                        <div className="p-12 text-center text-sm text-on-surface-variant">
                            No packages yet. Create your first credit pack to get started.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-surface-container bg-surface-container-low/40">
                                        <th className="px-4 py-3">Pack</th>
                                        <th className="px-4 py-3 text-right">Credits</th>
                                        <th className="px-4 py-3 text-right">Purchases</th>
                                        <th className="px-4 py-3 text-right">Price</th>
                                        <th className="px-4 py-3 text-right">Per credit</th>
                                        <th className="px-4 py-3">Stripe</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-container">
                                    {packages.map((pkg) => (
                                        <tr key={pkg.id ?? pkg.slug} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-bold text-on-surface">{pkg.name}</p>
                                                    {pkg.badge === 'popular' && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                            Popular
                                                        </span>
                                                    )}
                                                    {pkg.badge === 'best' && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                                                            Best
                                                        </span>
                                                    )}
                                                    {!pkg.is_active && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-on-surface-variant truncate mt-0.5">{pkg.slug}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right tabular-nums">
                                                <p className="text-sm font-bold text-on-surface inline-flex items-center gap-1">
                                                    <Coins size={12} className="text-primary" />
                                                    {pkg.credits.toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-right tabular-nums">
                                                <p className="text-sm font-semibold text-on-surface">
                                                    {pkg.purchases_count.toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-right tabular-nums">
                                                <p className="text-sm font-bold text-on-surface">
                                                    {currency.format(pkg.price, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-right tabular-nums">
                                                <p className="text-sm text-on-surface-variant">
                                                    {currency.format(pkg.per_credit, {
                                                        minimumFractionDigits: 4,
                                                        maximumFractionDigits: 4,
                                                    })}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                        pkg.stripe_price_id
                                                            ? 'text-emerald-700 bg-emerald-500/10'
                                                            : 'text-amber-700 bg-amber-500/10'
                                                    }`}
                                                >
                                                    {pkg.stripe_price_id ? 'Wired' : 'No price id'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => startEdit(pkg)}
                                                        title="Edit"
                                                        className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => remove(pkg)}
                                                        title="Delete"
                                                        className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {editing !== null && (
                <div
                    className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
                    onClick={() => setEditing(null)}
                >
                    <div
                        className="bg-surface-container-lowest rounded-3xl border border-surface-container max-w-lg w-full p-7 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant"
                            aria-label="Close"
                        >
                            <X size={16} className="mx-auto" />
                        </button>

                        <h3 className="text-lg font-headline font-extrabold text-on-surface mb-5">
                            {editing.id ? 'Edit credit package' : 'New credit package'}
                        </h3>

                        <div className="space-y-4">
                            <Field label="Name">
                                <input
                                    value={editing.name}
                                    onChange={(e) => update('name', e.target.value)}
                                    className={fieldClasses}
                                    placeholder="Starter pack"
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Credits">
                                    <input
                                        type="number"
                                        min={1}
                                        value={editing.credits}
                                        onChange={(e) => update('credits', Number(e.target.value))}
                                        className={fieldClasses}
                                    />
                                </Field>
                                <Field label="Price (cents)">
                                    <input
                                        type="number"
                                        min={0}
                                        value={editing.price_cents}
                                        onChange={(e) => updatePriceCents(Number(e.target.value))}
                                        className={fieldClasses}
                                    />
                                </Field>
                            </div>
                            {creditRateUsd > 0 && (
                                <p className="text-[11px] text-on-surface-variant -mt-2 whitespace-nowrap">
                                    Approx. cost value:{' '}
                                    <span className="font-semibold text-on-surface">
                                        {formatUsd((editing.credits || 0) * creditRateUsd)} USD
                                    </span>
                                    <span className="text-on-surface-variant/70">
                                        {' '}
                                        · at {formatUsd(creditRateUsd)} / credit
                                    </span>
                                </p>
                            )}
                            <Field label="Stripe Price ID — paste from Stripe Dashboard">
                                <input
                                    value={editing.stripe_price_id ?? ''}
                                    onChange={(e) =>
                                        update('stripe_price_id', e.target.value || null)
                                    }
                                    className={fieldClasses}
                                    placeholder="price_xxx (one-off)"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Badge">
                                    <select
                                        value={editing.badge ?? ''}
                                        onChange={(e) =>
                                            update(
                                                'badge',
                                                (e.target.value || null) as
                                                    | 'popular'
                                                    | 'best'
                                                    | null,
                                            )
                                        }
                                        className={fieldClasses}
                                    >
                                        <option value="">None</option>
                                        <option value="popular">Popular</option>
                                        <option value="best">Best value</option>
                                    </select>
                                </Field>
                                <Field label="Sort order">
                                    <input
                                        type="number"
                                        min={0}
                                        value={editing.sort_order}
                                        onChange={(e) =>
                                            update('sort_order', Number(e.target.value))
                                        }
                                        className={fieldClasses}
                                    />
                                </Field>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-bold text-on-surface">
                                <input
                                    type="checkbox"
                                    checked={editing.is_active}
                                    onChange={(e) => update('is_active', e.target.checked)}
                                />
                                Active
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={save}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 disabled:opacity-50"
                            >
                                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

const fieldClasses =
    'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                {label}
            </label>
            {children}
        </div>
    );
}

import { useForm } from '@inertiajs/react';
import { Coins, Minus, Plus, Save } from 'lucide-react';

import { FormCard, FormField } from '@/Components/Admin/SubscriptionPlans';
import { useT } from '@/lib/i18n';
import type { EditUser } from '../types';
import { formatUsd } from './creditFormat';

interface Props {
    user: EditUser;
    creditRateUsd: number;
}

interface AdjustForm {
    add: number;
    remove: number;
    note: string;
}

export default function CreditsForm({ user, creditRateUsd }: Props) {
    const t = useT();

    const form = useForm<AdjustForm>({
        add: 0,
        remove: 0,
        note: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/admin/users/${user.id}/credits`, {
            preserveScroll: true,
            onSuccess: () => form.reset('add', 'remove', 'note'),
        });
    };

    const inputClasses =
        'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

    const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);
    const balance = user.balance;
    const addUsd = (form.data.add || 0) * (creditRateUsd || 0);
    const removeUsd = (form.data.remove || 0) * (creditRateUsd || 0);

    return (
        <form onSubmit={submit} className="space-y-6">
            <FormCard
                title={t('admin.users.form.credits.summary.title', 'Current balance')}
                description={t(
                    'admin.users.form.credits.summary.description',
                    'What this user has available right now for the current period.',
                )}
                icon={<Coins size={16} className="text-primary" />}
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <BalanceCell
                        label={t('admin.users.form.credits.summary.used', 'Used')}
                        value={fmtNum(balance.used)}
                    />
                    <BalanceCell
                        label={t(
                            'admin.users.form.credits.summary.plan_remaining',
                            'Plan remaining',
                        )}
                        value={fmtNum(balance.plan_remaining)}
                    />
                    <BalanceCell
                        label={t(
                            'admin.users.form.credits.summary.purchased_remaining',
                            'Purchased',
                        )}
                        value={fmtNum(balance.purchased_remaining)}
                    />
                    <BalanceCell
                        label={t('admin.users.form.credits.summary.total', 'Total')}
                        value={fmtNum(balance.total)}
                    />
                </div>
                {balance.period_ends_at !== null && (
                    <p className="mt-3 text-[11px] text-on-surface-variant">
                        {t(
                            'admin.users.form.credits.summary.period',
                            'Current period ends {date}',
                            {
                                date: new Date(
                                    balance.period_ends_at,
                                ).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                }),
                            },
                        )}
                    </p>
                )}
            </FormCard>

            <FormCard
                title={t('admin.users.form.credits.adjust.title', 'Adjust credits')}
                description={t(
                    'admin.users.form.credits.adjust.description',
                    'Add or remove credits from this user\u2019s current period. Removals draw from the plan bucket first, then purchased credits, and clamp at zero.',
                )}
                icon={<Coins size={16} className="text-secondary" />}
            >
                {(() => {
                    const errors = form.errors as Record<string, string | undefined>;
                    return errors.at_least_one ? (
                        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700">
                            {errors.at_least_one}
                        </div>
                    ) : null;
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        label={t(
                            'admin.users.form.credits.adjust.add',
                            'Add credits',
                        )}
                        htmlFor="user-credits-add"
                    >
                        <div className="relative">
                            <Plus
                                size={14}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600"
                            />
                            <input
                                id="user-credits-add"
                                type="number"
                                min={0}
                                step={1}
                                value={form.data.add}
                                onChange={(e) =>
                                    form.setData('add', Number(e.target.value) || 0)
                                }
                                className={`${inputClasses} pl-9 tabular-nums`}
                            />
                        </div>
                        {creditRateUsd > 0 && (form.data.add || 0) > 0 && (
                            <p className="text-[11px] text-on-surface-variant mt-1.5">
                                {t(
                                    'admin.users.form.credits.adjust.approx',
                                    'Approx. cost value: {value} USD',
                                    { value: formatUsd(addUsd) },
                                )}
                                <span className="text-on-surface-variant/70">
                                    {' '}
                                    {t(
                                        'admin.users.form.credits.adjust.rate',
                                        '\u00b7 at {rate} / credit',
                                        { rate: formatUsd(creditRateUsd) },
                                    )}
                                </span>
                            </p>
                        )}
                        {form.errors.add && (
                            <p className="text-xs text-red-600 mt-1">
                                {form.errors.add}
                            </p>
                        )}
                    </FormField>
                    <FormField
                        label={t(
                            'admin.users.form.credits.adjust.remove',
                            'Remove credits',
                        )}
                        htmlFor="user-credits-remove"
                    >
                        <div className="relative">
                            <Minus
                                size={14}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500"
                            />
                            <input
                                id="user-credits-remove"
                                type="number"
                                min={0}
                                step={1}
                                value={form.data.remove}
                                onChange={(e) =>
                                    form.setData('remove', Number(e.target.value) || 0)
                                }
                                className={`${inputClasses} pl-9 tabular-nums`}
                            />
                        </div>
                        {creditRateUsd > 0 && (form.data.remove || 0) > 0 && (
                            <p className="text-[11px] text-on-surface-variant mt-1.5">
                                {t(
                                    'admin.users.form.credits.adjust.approx',
                                    'Approx. cost value: {value} USD',
                                    { value: formatUsd(removeUsd) },
                                )}
                                <span className="text-on-surface-variant/70">
                                    {' '}
                                    {t(
                                        'admin.users.form.credits.adjust.rate',
                                        '\u00b7 at {rate} / credit',
                                        { rate: formatUsd(creditRateUsd) },
                                    )}
                                </span>
                            </p>
                        )}
                        {form.errors.remove && (
                            <p className="text-xs text-red-600 mt-1">
                                {form.errors.remove}
                            </p>
                        )}
                    </FormField>
                </div>

                <div className="mt-4">
                    <FormField
                        label={t(
                            'admin.users.form.credits.adjust.note',
                            'Reason (optional)',
                        )}
                        htmlFor="user-credits-note"
                        hint={t(
                            'admin.users.form.credits.adjust.note_hint',
                            'Shown in the success flash after the adjustment.',
                        )}
                    >
                        <input
                            id="user-credits-note"
                            type="text"
                            value={form.data.note}
                            onChange={(e) => form.setData('note', e.target.value)}
                            placeholder={t(
                                'admin.users.form.credits.adjust.note_placeholder',
                                'e.g. comp account, refund, manual fix',
                            )}
                            className={inputClasses}
                            maxLength={500}
                        />
                        {form.errors.note && (
                            <p className="text-xs text-red-600 mt-1">
                                {form.errors.note}
                            </p>
                        )}
                    </FormField>
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        <Save size={14} />{' '}
                        {form.processing
                            ? t('admin.users.form.credits.adjust.saving', 'Adjusting\u2026')
                            : t(
                                  'admin.users.form.credits.adjust.submit',
                                  'Apply adjustment',
                              )}
                    </button>
                </div>
            </FormCard>
        </form>
    );
}

function BalanceCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-surface-container bg-surface-container-low/40 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {label}
            </p>
            <p className="text-lg font-headline font-extrabold text-on-surface mt-1 tabular-nums">
                {value}
            </p>
        </div>
    );
}

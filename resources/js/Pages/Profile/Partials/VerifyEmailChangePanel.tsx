import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { Mail, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { PendingEmailChange } from '../Edit';
import { Field, inputClasses } from './UpdateProfileInformationForm';

export default function VerifyEmailChangePanel({
    pending,
}: {
    pending: PendingEmailChange;
}) {
    const t = useT();
    const [cooldown, setCooldown] = useState(() =>
        cooldownRemaining(pending.last_sent_at, pending.resend_cooldown_seconds),
    );

    useEffect(() => {
        setCooldown(
            cooldownRemaining(pending.last_sent_at, pending.resend_cooldown_seconds),
        );
    }, [pending.last_sent_at, pending.resend_cooldown_seconds]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setInterval(() => {
            setCooldown((c) => Math.max(0, c - 1));
        }, 1000);
        return () => window.clearInterval(id);
    }, [cooldown]);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('profile.email-change.verify'), {
            preserveScroll: true,
            onSuccess: () => reset('code'),
        });
    };

    const resend = () => {
        if (cooldown > 0) return;
        router.post(
            route('profile.email-change.resend'),
            {},
            { preserveScroll: true },
        );
    };

    const cancel = () => {
        router.delete(route('profile.email-change.cancel'), {
            preserveScroll: true,
        });
    };

    return (
        <section className="bg-surface-container-lowest rounded-2xl border border-amber-300 overflow-hidden">
            <header className="flex items-start justify-between gap-3 px-6 py-5 border-b border-amber-200">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl flex-shrink-0 bg-amber-500/10 text-amber-700">
                        <Mail size={18} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-headline font-extrabold text-base text-on-surface">
                            {t('profile.email_change.title', 'Verify your new email')}
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {t(
                                'profile.email_change.description',
                                'We sent a 6-digit code to {email}. Enter it below to switch your account to this address.',
                                { email: pending.new_email },
                            )}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={cancel}
                    title={t('profile.email_change.cancel', 'Cancel email change')}
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors flex-shrink-0"
                >
                    <X size={16} />
                </button>
            </header>

            <form onSubmit={submit} className="px-6 py-5 space-y-4 max-w-md">
                <Field
                    label={t('profile.email_change.code_label', 'Verification code')}
                    error={errors.code}
                >
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={data.code}
                        onChange={(e) =>
                            setData(
                                'code',
                                e.target.value.replace(/\D/g, '').slice(0, 6),
                            )
                        }
                        placeholder="123456"
                        className={inputClasses + ' font-mono tracking-[0.5em] text-center text-lg'}
                        autoFocus
                    />
                </Field>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={resend}
                        disabled={cooldown > 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-on-surface-variant hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <RefreshCw size={12} />
                        {cooldown > 0
                            ? t('profile.email_change.resend_in', 'Resend in {s}s', {
                                  s: cooldown,
                              })
                            : t('profile.email_change.resend', 'Resend code')}
                    </button>
                    <button
                        type="submit"
                        disabled={data.code.length !== 6 || processing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ShieldCheck size={14} />
                        {processing
                            ? t('profile.email_change.verifying', 'Verifying\u2026')
                            : t('profile.email_change.verify', 'Verify & update')}
                    </button>
                </div>
            </form>
        </section>
    );
}

function cooldownRemaining(
    lastSentAtIso: string | null,
    cooldownSeconds: number,
): number {
    if (!lastSentAtIso) return 0;
    const sentAt = new Date(lastSentAtIso).getTime();
    if (Number.isNaN(sentAt)) return 0;
    const elapsedMs = Date.now() - sentAt;
    const remainingMs = cooldownSeconds * 1000 - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / 1000));
}

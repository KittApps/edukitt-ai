import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Field, inputClasses } from './UpdateProfileInformationForm';

export default function DeleteUserForm() {
    const t = useT();
    const [confirming, setConfirming] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({ password: '' });

    const close = () => {
        setConfirming(false);
        clearErrors();
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: close,
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    return (
        <>
            <section className="bg-surface-container-lowest rounded-2xl border border-red-200 overflow-hidden">
                <header className="flex items-start gap-3 px-6 py-5 border-b border-red-100">
                    <div className="p-2.5 rounded-xl flex-shrink-0 bg-red-500/10 text-red-600">
                        <AlertTriangle size={18} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-headline font-extrabold text-base text-on-surface">
                            {t('profile.delete.title', 'Delete account')}
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-xl">
                            {t(
                                'profile.delete.description',
                                'Once your account is deleted, all of its resources and data will be permanently removed. Download anything you want to keep before continuing.',
                            )}
                        </p>
                    </div>
                </header>
                <div className="px-6 py-5 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-red-500 text-white hover:brightness-110 transition-all"
                    >
                        <Trash2 size={14} />
                        {t('profile.delete.cta', 'Delete account')}
                    </button>
                </div>
            </section>

            <AnimatePresence>
                {confirming && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={close}
                    >
                        <motion.div
                            key="dialog"
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="bg-surface-container-lowest rounded-3xl border border-surface-container max-w-md w-full p-7 shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={close}
                                className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant"
                                aria-label={t('common.close', 'Close')}
                            >
                                <X size={16} className="mx-auto" />
                            </button>

                            <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center bg-red-500/10 text-red-600">
                                <AlertTriangle size={22} />
                            </div>
                            <h2 className="text-xl font-headline font-extrabold text-on-surface mb-1.5">
                                {t(
                                    'profile.delete.modal.title',
                                    'Delete your account?',
                                )}
                            </h2>
                            <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
                                {t(
                                    'profile.delete.modal.body',
                                    'This permanently removes your account and all generated content. Enter your password to confirm.',
                                )}
                            </p>

                            <form onSubmit={submit} className="space-y-5">
                                <Field
                                    label={t(
                                        'profile.delete.modal.password',
                                        'Password',
                                    )}
                                    error={errors.password}
                                >
                                    <input
                                        ref={passwordInput}
                                        type="password"
                                        value={data.password}
                                        onChange={(e) =>
                                            setData('password', e.target.value)
                                        }
                                        autoFocus
                                        className={inputClasses}
                                    />
                                </Field>

                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={close}
                                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:brightness-110 transition-all disabled:opacity-40"
                                    >
                                        <Trash2 size={14} />
                                        {processing
                                            ? t(
                                                  'profile.delete.modal.deleting',
                                                  'Deleting\u2026',
                                              )
                                            : t(
                                                  'profile.delete.modal.confirm',
                                                  'Delete account',
                                              )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

import { Head, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { type FormEventHandler } from 'react';

import { Recaptcha } from '@/Components/Public/Auth';
import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';

interface FormShape {
    name: string;
    email: string;
    subject: string;
    message: string;
    website: string;
    recaptcha_token: string;
}

export default function Contact() {
    const t = useT();
    const { props } = usePage();
    const flash =
        (props as { flash?: { contact_status?: string | null } }).flash ?? {};
    const justSent = flash.contact_status === 'sent';

    const form = useForm<FormShape>({
        name: '',
        email: '',
        subject: '',
        message: '',
        website: '',
        recaptcha_token: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('contact.submit'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <PublicLayout>
            <Head>
                <title>
                    {t('public.contact.head_title', 'Contact — EduKitt')}
                </title>
                <meta
                    name="description"
                    content={t(
                        'public.contact.head_description',
                        'Get in touch with our team. We usually reply within one business day.',
                    )}
                />
            </Head>

            <section className="px-6 pt-14 pb-8 md:pt-20 md:pb-10">
                <div className="max-w-2xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider inline-flex items-center gap-2">
                            <Mail size={16} />
                            {t('public.contact.kicker', 'Contact')}
                        </p>
                        <h1 className="text-3xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                            {t('public.contact.title', 'Get in touch')}
                        </h1>
                        <p className="text-on-surface-variant mt-3 text-base md:text-lg">
                            {t(
                                'public.contact.subtitle',
                                'Have a question, feedback, or partnership idea? Send us a note and we’ll get back to you within one business day.',
                            )}
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="px-6 pb-20 md:pb-28">
                <div className="max-w-2xl mx-auto">
                    {justSent && (
                        <div
                            role="status"
                            className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                        >
                            <CheckCircle2
                                size={18}
                                className="flex-shrink-0 mt-0.5"
                            />
                            <p className="min-w-0">
                                {t(
                                    'public.contact.success',
                                    'Thanks — your message is on its way. We’ll reply as soon as we can.',
                                )}
                            </p>
                        </div>
                    )}

                    <form
                        onSubmit={submit}
                        className="space-y-5 rounded-2xl border border-surface-container bg-surface-container-lowest p-6 md:p-8"
                        noValidate
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field
                                id="contact-name"
                                label={t(
                                    'public.contact.fields.name.label',
                                    'Your name',
                                )}
                                error={form.errors.name}
                            >
                                <input
                                    id="contact-name"
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    required
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    placeholder={t(
                                        'public.contact.fields.name.placeholder',
                                        'How should we call you?',
                                    )}
                                    className={inputClasses(
                                        Boolean(form.errors.name),
                                    )}
                                />
                            </Field>

                            <Field
                                id="contact-email"
                                label={t(
                                    'public.contact.fields.email.label',
                                    'Email',
                                )}
                                error={form.errors.email}
                            >
                                <input
                                    id="contact-email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                    placeholder={t(
                                        'public.contact.fields.email.placeholder',
                                        'you@example.com',
                                    )}
                                    className={inputClasses(
                                        Boolean(form.errors.email),
                                    )}
                                />
                            </Field>
                        </div>

                        <Field
                            id="contact-subject"
                            label={t(
                                'public.contact.fields.subject.label',
                                'Subject',
                            )}
                            error={form.errors.subject}
                        >
                            <input
                                id="contact-subject"
                                type="text"
                                name="subject"
                                required
                                value={form.data.subject}
                                onChange={(e) =>
                                    form.setData('subject', e.target.value)
                                }
                                placeholder={t(
                                    'public.contact.fields.subject.placeholder',
                                    'What is this about?',
                                )}
                                className={inputClasses(
                                    Boolean(form.errors.subject),
                                )}
                            />
                        </Field>

                        <Field
                            id="contact-message"
                            label={t(
                                'public.contact.fields.message.label',
                                'Message',
                            )}
                            error={form.errors.message}
                        >
                            <textarea
                                id="contact-message"
                                name="message"
                                required
                                rows={6}
                                value={form.data.message}
                                onChange={(e) =>
                                    form.setData('message', e.target.value)
                                }
                                placeholder={t(
                                    'public.contact.fields.message.placeholder',
                                    'Tell us a bit more — the more detail the better.',
                                )}
                                className={`${inputClasses(Boolean(form.errors.message))} resize-y min-h-32`}
                            />
                        </Field>

                        <div
                            aria-hidden="true"
                            className="absolute pointer-events-none opacity-0 -left-[9999px]"
                        >
                            <label htmlFor="contact-website">Website</label>
                            <input
                                id="contact-website"
                                type="text"
                                name="website"
                                tabIndex={-1}
                                autoComplete="off"
                                value={form.data.website}
                                onChange={(e) =>
                                    form.setData('website', e.target.value)
                                }
                            />
                        </div>

                        <Recaptcha
                            onToken={(token) =>
                                form.setData('recaptcha_token', token ?? '')
                            }
                            error={form.errors.recaptcha_token}
                        />

                        <div className="flex items-center justify-end pt-2">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                <Send size={16} />
                                {form.processing
                                    ? t(
                                          'public.contact.cta_loading',
                                          'Sending…',
                                      )
                                    : t('public.contact.cta', 'Send message')}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </PublicLayout>
    );
}

function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="block text-sm font-bold text-on-surface mb-2"
            >
                {label}
            </label>
            {children}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}

function inputClasses(invalid: boolean): string {
    const base =
        'w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-all text-sm';
    return invalid
        ? `${base} border-2 border-red-500/60 focus:border-red-500`
        : `${base} border border-surface-container focus:border-primary/60 focus:ring-2 focus:ring-primary/15`;
}

import { useForm } from '@inertiajs/react';
import { AlertTriangle, ListTodo, Mail, Save, Sparkles } from 'lucide-react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';

export interface JobsBlock {
    email_sending: boolean;
    ai_generation: boolean;
}

interface Props {
    initial: JobsBlock;
    queueEnabled: boolean;
}

interface JobRow {
    key: keyof JobsBlock;
    icon: React.ReactNode;
    label: string;
    description: string;
}

export default function JobsForm({ initial, queueEnabled }: Props) {
    const t = useT();
    const form = useForm<JobsBlock>({
        email_sending: initial.email_sending,
        ai_generation: initial.ai_generation,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/queue/jobs', { preserveScroll: true });
    };

    // Adding a new job in the future is one line: append another entry
    // here, add the corresponding key to the JobsBlock interface, and
    // teach the controller to persist it.
    const rows: JobRow[] = [
        {
            key: 'email_sending',
            icon: <Mail size={18} />,
            label: t('admin.queue.jobs.email_sending.label', 'Email sending'),
            description: t(
                'admin.queue.jobs.email_sending.description',
                'Send transactional emails (password reset, verification, etc.) through the queue.',
            ),
        },
        {
            key: 'ai_generation',
            icon: <Sparkles size={18} />,
            label: t('admin.queue.jobs.ai_generation.label', 'AI content generation'),
            description: t(
                'admin.queue.jobs.ai_generation.description',
                'Run AI generation (Quick Learn, Course, Quiz, Lesson) on a background worker. The request returns immediately and the wizard polls until the result is ready.',
            ),
        },
    ];

    return (
        <EditorPane
            icon={<ListTodo size={22} />}
            title={t('admin.queue.jobs.title', 'Background jobs')}
            description={t(
                'admin.queue.jobs.description',
                'Pick which background features actually use the queue. Anything left OFF runs synchronously even while the queue system is enabled.',
            )}
            onSubmit={submit}
        >
            {!queueEnabled && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <p className="min-w-0">
                        {t(
                            'admin.queue.jobs.queue_off_warning',
                            'The queue system is disabled on the General tab. Toggles below are saved but have no effect until you enable the queue.',
                        )}
                    </p>
                </div>
            )}

            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                {rows.map((row) => (
                    <label
                        key={row.key}
                        htmlFor={`queue-job-${row.key}`}
                        className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                    >
                        <span className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            {row.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-on-surface">
                                {row.label}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                {row.description}
                            </p>
                        </div>
                        <span className="flex-shrink-0 pt-0.5">
                            <Toggle
                                id={`queue-job-${row.key}`}
                                checked={form.data[row.key]}
                                onChange={(v) => form.setData(row.key, v)}
                            />
                        </span>
                    </label>
                ))}
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} /> {t('admin.queue.jobs.save', 'Save job toggles')}
            </button>
        </EditorPane>
    );
}

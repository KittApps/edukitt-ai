import { useForm } from '@inertiajs/react';
import { Save, Users } from 'lucide-react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';

export interface AccountsBlock {
    registration_enabled: boolean;
    email_verification: boolean;
    deletion_enabled: boolean;
}

interface Props {
    initial: AccountsBlock;
}

interface ToggleRow {
    key: keyof AccountsBlock;
    label: string;
    description: string;
}

export default function AccountsForm({ initial }: Props) {
    const t = useT();
    const form = useForm<AccountsBlock>({
        registration_enabled: initial.registration_enabled,
        email_verification: initial.email_verification,
        deletion_enabled: initial.deletion_enabled,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general/account', {
            preserveScroll: true,
        });
    };

    const rows: ToggleRow[] = [
        {
            key: 'registration_enabled',
            label: t(
                'admin.general.accounts.registration_enabled.label',
                'Allow new registrations',
            ),
            description: t(
                'admin.general.accounts.registration_enabled.description',
                'When disabled, the public signup page is hidden and new users cannot create accounts.',
            ),
        },
        {
            key: 'email_verification',
            label: t(
                'admin.general.accounts.email_verification.label',
                'Require email verification',
            ),
            description: t(
                'admin.general.accounts.email_verification.description',
                'New users must verify their email address before they can sign in. Existing users must verify any email change.',
            ),
        },
        {
            key: 'deletion_enabled',
            label: t(
                'admin.general.accounts.deletion_enabled.label',
                'Let users delete their own account',
            ),
            description: t(
                'admin.general.accounts.deletion_enabled.description',
                'When disabled, the delete-account card is hidden from the user profile page and self-service deletion is blocked.',
            ),
        },
    ];

    return (
        <EditorPane
            icon={<Users size={22} />}
            title={t('admin.general.accounts.title', 'Accounts')}
            description={t(
                'admin.general.accounts.description',
                'Control how user accounts are created, verified and removed.',
            )}
            onSubmit={submit}
        >
            <div className="rounded-xl border border-surface-container divide-y divide-surface-container">
                {rows.map((row) => (
                    <label
                        key={row.key}
                        htmlFor={`general-accounts-${row.key}`}
                        className="flex items-start gap-3 px-4 py-4 cursor-pointer"
                    >
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
                                id={`general-accounts-${row.key}`}
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
                <Save size={16} />{' '}
                {t('admin.general.accounts.save', 'Save account settings')}
            </button>
        </EditorPane>
    );
}

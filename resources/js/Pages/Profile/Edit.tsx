import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useT } from '@/lib/i18n';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import DeleteUserForm from './Partials/DeleteUserForm';
import VerifyEmailChangePanel from './Partials/VerifyEmailChangePanel';

export interface PendingEmailChange {
    new_email: string;
    expires_at: string | null;
    last_sent_at: string | null;
    resend_cooldown_seconds: number;
}

interface Props {
    mustVerifyEmail: boolean;
    verificationRequired: boolean;
    accountDeletionEnabled: boolean;
    pendingEmailChange: PendingEmailChange | null;
    status?: string;
}

export default function Edit({
    mustVerifyEmail,
    verificationRequired,
    accountDeletionEnabled,
    pendingEmailChange,
    status,
}: Props) {
    const t = useT();

    const subtitle = accountDeletionEnabled
        ? t(
              'profile.subtitle',
              'Update your personal details, change your password, or remove your account.',
          )
        : t(
              'profile.subtitle_no_delete',
              'Update your personal details and change your password.',
          );

    return (
        <AppLayout>
            <Head title={t('profile.head_title', 'Profile')} />

            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                        <User size={16} />
                        {t('profile.kicker', 'Profile')}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                        {t('profile.title', 'Your account')}
                    </h1>
                    <p className="text-on-surface-variant mt-2 max-w-xl">
                        {subtitle}
                    </p>
                </motion.div>

                {pendingEmailChange && (
                    <VerifyEmailChangePanel pending={pendingEmailChange} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        verificationRequired={verificationRequired}
                        hasPendingEmailChange={pendingEmailChange !== null}
                        status={status}
                    />
                    <UpdatePasswordForm />
                </div>

                {accountDeletionEnabled && <DeleteUserForm />}
            </div>
        </AppLayout>
    );
}

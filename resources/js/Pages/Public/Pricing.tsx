import { Head } from '@inertiajs/react';

import PublicLayout from '@/Layouts/PublicLayout';
import {
    CtaBannerSection,
    PlansTeaserSection,
    type PublicPlan,
} from '@/Components/Public/Home';
import { useT } from '@/lib/i18n';

interface Props {
    plans: PublicPlan[];
}

export default function Pricing({ plans }: Props) {
    const t = useT();

    return (
        <PublicLayout>
            <Head>
                <title>{t('public.pricing.head_title', 'Pricing — EduKitt')}</title>
                <meta
                    name="description"
                    content={t(
                        'public.pricing.head_description',
                        'Simple plans that grow with you. Start free, upgrade when you need more credits or advanced AI models.',
                    )}
                />
            </Head>

            <PlansTeaserSection plans={plans} centered />
            <CtaBannerSection />
        </PublicLayout>
    );
}

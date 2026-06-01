import { Head } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    AudienceSection,
    CtaBannerSection,
    FeatureGrid,
    HeroSection,
    HowItWorksSection,
} from '@/Components/Public/Home';
import { useT } from '@/lib/i18n';
import { useBrand } from '@/lib/settings';

export default function Home() {
    const t = useT();
    const brand = useBrand();

    const headTitle =
        brand.site_title ??
        t('public.home.head_title', 'EduKitt — AI-powered learning');
    const headDescription =
        brand.site_description ??
        t(
            'public.home.head_description',
            'Turn any topic into an AI-generated course, Quick Learn, or adaptive quiz. Personalized learning powered by your favorite AI models.',
        );

    return (
        <PublicLayout>
            <Head>
                <title>{headTitle}</title>
                <meta name="description" content={headDescription} />
            </Head>

            <HeroSection />
            <FeatureGrid />
            <HowItWorksSection />
            <AudienceSection />
            <CtaBannerSection />
        </PublicLayout>
    );
}

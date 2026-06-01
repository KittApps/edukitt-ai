import ChipSelector from '@/Components/Shared/ChipSelector';
import { useT } from '@/lib/i18n';

interface PersonalizeOptionDto {
    key: string;
    value: string;
    is_default?: boolean;
}

interface PersonalizeGroupDto {
    key: string;
    label: string;
    description: string | null;
    options: PersonalizeOptionDto[];
}

interface Props {
    personalization: Record<string, string>;
    setPersonalization: (p: Record<string, string>) => void;
    groups?: PersonalizeGroupDto[];
    timeLimit: string;
    setTimeLimit: (v: string) => void;
}

export default function ConfigSection({
    personalization,
    setPersonalization,
    groups = [],
    timeLimit,
    setTimeLimit,
}: Props) {
    const t = useT();

    const timeLimits = [
        t('quizzes.create.time.no_limit', 'No Limit'),
        '5 min',
        '10 min',
        '15 min',
        '30 min',
    ];

    const handleSelect = (key: string, value: string) => {
        setPersonalization({ ...personalization, [key]: value });
    };

    return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container space-y-6">
            <h3 className="font-headline font-extrabold text-lg text-on-surface">
                {t('quizzes.create.personalize.heading', 'Personalize Your Quiz')}
            </h3>

            {groups.map((group) => (
                <ChipSelector
                    key={group.key}
                    label={group.label}
                    options={group.options.map((opt) => opt.value)}
                    selected={personalization[group.key] || ''}
                    onSelect={(v) => handleSelect(group.key, v)}
                    colorClass="secondary"
                />
            ))}

            <ChipSelector
                label={t('quizzes.create.config.time_limit', 'Time Limit')}
                options={timeLimits}
                selected={timeLimit}
                onSelect={setTimeLimit}
                colorClass="secondary"
            />
        </div>
    );
}

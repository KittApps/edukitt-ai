import { Sparkles, HelpCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface Props {
    topic: string;
    setTopic: (topic: string) => void;
}

export default function TopicInput({ topic, setTopic }: Props) {
    const t = useT();
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container space-y-5">
            <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 block">
                    {t('quizzes.create.topic.label', 'Quiz Topic')}
                </label>
                <div className="flex items-start gap-3">
                    <div className="mt-1 p-2.5 rounded-xl bg-secondary/10 text-secondary flex-shrink-0">
                        <HelpCircle size={20} />
                    </div>
                    <textarea
                        rows={4}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={t(
                            'quizzes.create.topic.placeholder',
                            'What should the quiz be about?',
                        )}
                        className="w-full bg-transparent text-on-surface text-lg font-headline font-bold placeholder:text-outline-variant resize-none focus:outline-none leading-relaxed"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
                <Sparkles size={14} className="text-secondary" />
                <p className="text-xs text-on-surface-variant">
                    {t(
                        'quizzes.create.topic.hint',
                        'The AI will generate questions based on this topic and your settings.',
                    )}
                </p>
            </div>
        </div>
    );
}

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';

const typingPlaceholders = [
    'Learn Python from scratch',
    'Understand how neural networks work',
    'Build a REST API with Node.js',
    'Master CSS Grid and Flexbox',
    'Introduction to quantum computing',
    'Data analysis with Pandas',
    'Create a mobile app with React Native',
];

function useTypingPlaceholder(phrases: string[], typingSpeed = 60, pauseMs = 2000) {
    const [text, setText] = useState('');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let charIndex = 0;
        let isDeleting = false;
        let currentPhrase = 0;

        const tick = () => {
            const phrase = phrases[currentPhrase];

            if (!isDeleting) {
                charIndex++;
                setText(phrase.slice(0, charIndex));

                if (charIndex === phrase.length) {
                    isDeleting = true;
                    timeoutRef.current = setTimeout(tick, pauseMs);
                    return;
                }
            } else {
                charIndex--;
                setText(phrase.slice(0, charIndex));

                if (charIndex === 0) {
                    isDeleting = false;
                    currentPhrase = (currentPhrase + 1) % phrases.length;
                    timeoutRef.current = setTimeout(tick, 300);
                    return;
                }
            }

            timeoutRef.current = setTimeout(tick, isDeleting ? 30 : typingSpeed);
        };

        timeoutRef.current = setTimeout(tick, 500);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [phrases, typingSpeed, pauseMs]);

    return text;
}

interface Props {
    topic: string;
    setTopic: (topic: string) => void;
}

export default function TopicInput({ topic, setTopic }: Props) {
    const t = useT();
    const animatedPlaceholder = useTypingPlaceholder(typingPlaceholders);
    const showAnimated = topic.length === 0;

    return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container space-y-5">
            <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 block">
                    {t('courses.create.topic.label', 'What do you want to learn?')}
                </label>
                <div className="flex items-start gap-3">
                    <div className="mt-1 p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <BookOpen size={20} />
                    </div>
                    <div className="relative flex-1">
                        <textarea
                            rows={3}
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full bg-transparent text-on-surface text-lg font-headline font-bold resize-none focus:outline-none leading-relaxed relative z-10"
                        />
                        {showAnimated && (
                            <div className="absolute inset-0 pointer-events-none flex">
                                <span className="text-lg font-headline font-bold text-outline-variant">
                                    {animatedPlaceholder}
                                    <span className="inline-block w-0.5 h-5 bg-primary/50 ml-0.5 align-middle animate-pulse" />
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
                <Sparkles size={14} className="text-primary" />
                <p className="text-xs text-on-surface-variant">
                    {t(
                        'courses.create.topic.hint',
                        'Describe your goal — the AI will build a course around it.',
                    )}
                </p>
            </div>
        </div>
    );
}

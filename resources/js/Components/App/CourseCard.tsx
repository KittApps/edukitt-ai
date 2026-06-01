import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useT } from '@/lib/i18n';

interface CourseCardProps {
    id?: number;
    icon: ReactNode;
    title: string;
    subtitle: string;
    progress: number;
    color?: 'primary' | 'secondary';
    moduleInfo: string;
}

export default function CourseCard({
    id,
    icon,
    title,
    subtitle,
    progress,
    color = 'primary',
    moduleInfo,
}: CourseCardProps) {
    const t = useT();
    const isPrimary = color === 'primary';
    const Wrapper = id ? Link : 'div';
    const wrapperProps = id ? { href: `/app/courses/${id}` } : {};

    return (
        <Wrapper {...wrapperProps as any}>
            <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group relative bg-surface-container-lowest rounded-2xl p-6 border border-surface-container hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
                <div className="flex justify-between items-start mb-5">
                    <div className={`p-3 rounded-xl ${isPrimary ? 'bg-primary/8 text-primary' : 'bg-secondary/8 text-secondary'}`}>
                        {icon}
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-lg">
                        {moduleInfo}
                    </span>
                </div>

                <h3 className="font-headline font-extrabold text-lg mb-1 text-on-surface leading-tight">{title}</h3>
                <p className="text-sm text-on-surface-variant mb-6 font-medium">{subtitle}</p>

                <div className="space-y-2.5">
                    <div className={`flex justify-between text-[10px] font-black uppercase tracking-widest ${isPrimary ? 'text-primary' : 'text-secondary'}`}>
                        <span>{t('library.card.progress', 'Progress')}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                            className={`h-full rounded-full ${isPrimary ? 'bg-primary' : 'bg-secondary'}`}
                        />
                    </div>
                </div>

                <div className={`absolute bottom-6 right-6 h-11 w-11 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0 ${
                    isPrimary ? 'bg-primary text-white shadow-primary/25' : 'bg-secondary text-white shadow-secondary/25'
                }`}>
                    <Play size={18} fill="currentColor" />
                </div>
            </motion.div>
        </Wrapper>
    );
}

import { ReactNode } from 'react';

interface Props {
    aside: ReactNode;
    children: ReactNode;
    /**
     * - `normal`: left 4/12, right 8/12 (xl: 3/9) — AI Providers, Localization
     * - `wide-left`: left 5/12, right 7/12 (xl: 4/8) — AI Content (longer labels)
     */
    leftWidth?: 'normal' | 'wide-left';
}

export default function TwoColumnLayout({
    aside,
    children,
    leftWidth = 'normal',
}: Props) {
    const [leftClass, rightClass] =
        leftWidth === 'wide-left'
            ? ['lg:col-span-5 xl:col-span-4', 'lg:col-span-7 xl:col-span-8']
            : ['lg:col-span-4 xl:col-span-3', 'lg:col-span-8 xl:col-span-9'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className={leftClass}>{aside}</aside>
            <section className={rightClass}>{children}</section>
        </div>
    );
}

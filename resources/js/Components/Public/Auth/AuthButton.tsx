import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    variant?: 'primary' | 'secondary';
    children: ReactNode;
}

export default function AuthButton({
    loading = false,
    disabled,
    variant = 'primary',
    children,
    className = '',
    type = 'submit',
    ...props
}: AuthButtonProps) {
    const isDisabled = disabled || loading;

    const baseClasses =
        'group relative w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

    const variantClasses =
        variant === 'primary'
            ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100'
            : 'bg-surface-container-lowest text-on-surface border border-surface-container hover:border-primary/30 hover:text-primary disabled:opacity-60';

    return (
        <button
            {...props}
            type={type}
            disabled={isDisabled}
            className={`${baseClasses} ${variantClasses} ${className}`.trim()}
        >
            {loading && (
                <Loader2
                    aria-hidden
                    size={16}
                    className="animate-spin"
                />
            )}
            <span>{children}</span>
        </button>
    );
}

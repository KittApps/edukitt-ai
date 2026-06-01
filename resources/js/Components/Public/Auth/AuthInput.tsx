import {
    forwardRef,
    type InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

export interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isFocused?: boolean;
    invalid?: boolean;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
    { type = 'text', className = '', isFocused = false, invalid = false, ...props },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => localRef.current as HTMLInputElement);

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    const baseClasses =
        'w-full px-4 py-3 rounded-xl bg-surface-container-low/60 text-on-surface placeholder:text-on-surface-variant/60 text-sm font-medium border transition-all duration-150 focus:outline-none focus:bg-surface-container-lowest disabled:opacity-60 disabled:cursor-not-allowed';

    const stateClasses = invalid
        ? 'border-error/60 focus:border-error focus:ring-2 focus:ring-error/20'
        : 'border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20';

    return (
        <input
            {...props}
            ref={localRef}
            type={type}
            aria-invalid={invalid || undefined}
            className={`${baseClasses} ${stateClasses} ${className}`.trim()}
        />
    );
});

export default AuthInput;

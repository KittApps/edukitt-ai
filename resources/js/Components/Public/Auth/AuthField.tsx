import { type ReactNode } from 'react';

interface AuthFieldProps {
    htmlFor: string;
    label: string;
    error?: string;
    hint?: string;
    trailing?: ReactNode;
    children: ReactNode;
}

export default function AuthField({
    htmlFor,
    label,
    error,
    hint,
    trailing,
    children,
}: AuthFieldProps) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
                <label
                    htmlFor={htmlFor}
                    className="block text-xs font-bold text-on-surface tracking-wide"
                >
                    {label}
                </label>
                {trailing}
            </div>
            {children}
            {error ? (
                <p
                    id={`${htmlFor}-error`}
                    className="text-xs font-semibold text-error mt-1"
                    role="alert"
                >
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

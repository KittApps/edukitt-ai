import { useEffect, useRef } from 'react';

import { useRecaptcha } from '@/lib/settings';
import { useTheme, type AvailableTheme } from '@/lib/theme';

interface Props {
    onToken: (token: string | null) => void;
    error?: string;
}

interface GrecaptchaApi {
    render: (
        container: HTMLElement,
        params: {
            sitekey: string;
            theme?: 'light' | 'dark';
            callback?: (token: string) => void;
            'expired-callback'?: () => void;
            'error-callback'?: () => void;
        },
    ) => number;
    reset: (widgetId?: number) => void;
}

declare global {
    interface Window {
        grecaptcha?: GrecaptchaApi;
        __recaptchaOnLoad?: () => void;
    }
}

const SCRIPT_ID = 'g-recaptcha-script';
const SCRIPT_SRC =
    'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit';

const ready: Promise<void> = new Promise((resolve) => {
    if (typeof window === 'undefined') return;
    if (window.grecaptcha) {
        resolve();
        return;
    }
    window.__recaptchaOnLoad = () => resolve();
});

function ensureScriptLoaded() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
}

export default function Recaptcha({ onToken, error }: Props) {
    const recaptcha = useRecaptcha();
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<number | null>(null);
    const onTokenRef = useRef(onToken);
    const handledErrorRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        onTokenRef.current = onToken;
    }, [onToken]);

    const siteKey = recaptcha.site_key;
    const enabled = recaptcha.enabled && Boolean(siteKey);

    useEffect(() => {
        if (!enabled || !siteKey) return;
        ensureScriptLoaded();

        let cancelled = false;
        ready.then(() => {
            if (cancelled) return;
            if (!containerRef.current || !window.grecaptcha) return;
            if (widgetIdRef.current !== null) return;

            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
                sitekey: siteKey,
                theme: resolveWidgetTheme(theme.active, theme.available),
                callback: (token: string) => onTokenRef.current(token),
                'expired-callback': () => onTokenRef.current(null),
                'error-callback': () => onTokenRef.current(null),
            });
        });

        return () => {
            cancelled = true;
        };
    }, [enabled, siteKey, theme.active, theme.available]);

    useEffect(() => {
        if (!error) {
            handledErrorRef.current = undefined;
            return;
        }
        if (!enabled) return;
        if (handledErrorRef.current === error) return;
        if (widgetIdRef.current === null || !window.grecaptcha) return;

        handledErrorRef.current = error;

        try {
            window.grecaptcha.reset(widgetIdRef.current);
        } catch {
            return;
        }
        onTokenRef.current(null);
    }, [enabled, error]);

    if (!enabled) return null;

    return (
        <div className="space-y-1.5">
            <div ref={containerRef} />
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

function resolveWidgetTheme(
    activeKey: string,
    available: AvailableTheme[],
): 'light' | 'dark' {
    const isDark =
        available.find((t) => t.key === activeKey)?.is_dark ?? false;
    return isDark ? 'dark' : 'light';
}

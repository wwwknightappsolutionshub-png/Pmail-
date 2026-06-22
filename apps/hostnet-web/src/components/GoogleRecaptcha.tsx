import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => number;
      reset: (widgetId?: number) => void;
    };
    __recaptchaOnLoad?: () => void;
  }
}

type Props = {
  onToken: (token: string) => void;
  onExpire?: () => void;
};

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "";

let scriptLoading: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    window.__recaptchaOnLoad = () => resolve();
    const existing = document.querySelector('script[src*="google.com/recaptcha/api.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

export function GoogleRecaptcha({ onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void loadRecaptchaScript().then(() => {
      if (cancelled || !containerRef.current || !window.grecaptcha) return;
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onToken(token),
        "expired-callback": () => {
          onExpire?.();
          onToken("");
        },
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [onExpire, onToken]);

  if (!SITE_KEY) {
    return (
      <p className="register-pricing-note muted">
        reCAPTCHA site key not configured (dev mode — submissions allowed without captcha).
      </p>
    );
  }

  return <div className="register-recaptcha" ref={containerRef} aria-busy={!ready} />;
}

export function resetRecaptcha() {
  if (window.grecaptcha) window.grecaptcha.reset();
}

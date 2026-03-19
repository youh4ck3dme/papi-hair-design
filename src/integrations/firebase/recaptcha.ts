declare global {
    interface Window {
        grecaptcha?: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

let recaptchaLoaded = false;
let recaptchaLoading = false;

function loadRecaptchaScript(siteKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (recaptchaLoaded) {
            resolve();
            return;
        }
        if (recaptchaLoading) {
            // Wait for it to load
            const checkLoaded = () => {
                if (window.grecaptcha) {
                    recaptchaLoaded = true;
                    resolve();
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            checkLoaded();
            return;
        }
        recaptchaLoading = true;
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.onload = () => {
            recaptchaLoaded = true;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export async function getRecaptchaToken(action: string): Promise<string | null> {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
    if (!siteKey) {
        console.warn("reCAPTCHA site key not configured, skipping token generation");
        return null;
    }

    try {
        await loadRecaptchaScript(siteKey);
        if (!window.grecaptcha) {
            console.error("reCAPTCHA failed to load");
            return null;
        }
        const token = await window.grecaptcha.execute(siteKey, { action });
        return token;
    } catch (error) {
        console.error("Failed to get reCAPTCHA token:", error);
        return null;
    }
}
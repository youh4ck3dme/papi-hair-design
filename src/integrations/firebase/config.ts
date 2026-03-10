import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check (optional but recommended for security)
// reCAPTCHA Enterprise is the modern choice.
// In local dev/CI, use the Debug Token if provided.
if (typeof window !== "undefined") {
    const appCheckSiteKey =
        (import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY as string | undefined) ||
        (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined);

    if (import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN) {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN;
    }

    if (appCheckSiteKey) {
        try {
            initializeAppCheck(app, {
                provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
                isTokenAutoRefreshEnabled: true,
            });
            console.log("🔐 Firebase App Check: Initialized with site key.");
        } catch (err) {
            console.error("🔐 Firebase App Check: Failed to initialize:", err);
        }
    } else if (import.meta.env.DEV) {
        console.warn("🔐 Firebase App Check: No site key found. Skipping initialization.");
    }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const functionsRegion = (import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION as string | undefined)?.trim() || "europe-west1";
export const functions = getFunctions(app, functionsRegion);

export default app;

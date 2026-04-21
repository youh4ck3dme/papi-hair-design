import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import "@/styles/liquid-cookie.css";

interface CookiePrefs {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = "cookie_prefs_v1";
const CONSENT_SUBJECT_KEY = "consent_subject_id_v1";

type ConsentAction = "accept" | "reject" | "update";

function loadPrefs(): CookiePrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.necessary !== true || typeof p.analytics !== "boolean" || typeof p.marketing !== "boolean") return null;
    return p as CookiePrefs;
  } catch {
    return null;
  }
}

function savePrefs(prefs: Omit<CookiePrefs, "timestamp">) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, timestamp: new Date().toISOString() }));
}

function applyGtagConsent(prefs: Omit<CookiePrefs, "timestamp">) {
  if (typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;

  gtag("consent", "update", {
    analytics_storage: prefs.analytics ? "granted" : "denied",
    ad_storage: prefs.marketing ? "granted" : "denied",
    ad_user_data: prefs.marketing ? "granted" : "denied",
    ad_personalization: prefs.marketing ? "granted" : "denied",
  });
}

function getConsentSubjectId() {
  const existing = localStorage.getItem(CONSENT_SUBJECT_KEY);
  if (existing) return existing;
  const next =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(CONSENT_SUBJECT_KEY, next);
  return next;
}

async function trackConsentEvent(prefs: Omit<CookiePrefs, "timestamp">, action: ConsentAction) {
  const categories = [
    "necessary",
    ...(prefs.analytics ? ["analytics"] : []),
    ...(prefs.marketing ? ["marketing"] : []),
  ];

  try {
    const [{ httpsCallable }, { functions }] = await Promise.all([
      import("firebase/functions"),
      import("@/integrations/firebase/config"),
    ]);
    const consentEventFn = httpsCallable<any, any>(functions, "consentEvent");
    await consentEventFn({
      subject_type: "session",
      subject_id: getConsentSubjectId(),
      action,
      categories,
      source: "web",
      metadata: {
        consent_version: 1,
        origin: window.location.origin,
      },
    });
  } catch (error) {
    console.warn("Consent event tracking failed", error);
  }
}

export default function CookieConsent() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const isHiddenRoute = pathname.startsWith("/papihairsalon2026");
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing = loadPrefs();
    if (!existing) {
      setVisible(true);
      return;
    }
    applyGtagConsent(existing);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (!visible || isHiddenRoute || !cardRef.current) {
      body.classList.remove("cookie-consent-visible");
      root.style.removeProperty("--cookie-consent-offset");
      return;
    }

    const updateOffset = () => {
      const rect = cardRef.current?.getBoundingClientRect();
      const offset = rect ? Math.ceil(rect.height + 28) : 0;
      root.style.setProperty("--cookie-consent-offset", `${offset}px`);
      body.classList.add("cookie-consent-visible");
    };

    updateOffset();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateOffset)
        : null;

    if (observer && cardRef.current) {
      observer.observe(cardRef.current);
    }
    window.addEventListener("resize", updateOffset);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateOffset);
      body.classList.remove("cookie-consent-visible");
      root.style.removeProperty("--cookie-consent-offset");
    };
  }, [visible, isHiddenRoute, customize]);

  // ESC closes customize panel
  useEffect(() => {
    if (!customize) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCustomize(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [customize]);

  const acceptAll = useCallback(() => {
    const prefs = { necessary: true as const, analytics: true, marketing: true };
    savePrefs(prefs);
    applyGtagConsent(prefs);
    void trackConsentEvent(prefs, "accept");
    setVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    const prefs = { necessary: true as const, analytics: false, marketing: false };
    savePrefs(prefs);
    applyGtagConsent(prefs);
    void trackConsentEvent(prefs, "reject");
    setVisible(false);
  }, []);

  const openCustomize = useCallback(() => {
    const existing = loadPrefs();
    if (existing) { setAnalytics(existing.analytics); setMarketing(existing.marketing); }
    setCustomize(true);
  }, []);

  const saveCustom = useCallback(() => {
    const prefs = { necessary: true as const, analytics, marketing };
    savePrefs(prefs);
    applyGtagConsent(prefs);
    void trackConsentEvent(prefs, "update");
    setVisible(false);
  }, [analytics, marketing]);

  if (!visible || isHiddenRoute) return null;

  return (
    <div className="cookie-wrap" role="dialog" aria-label="Cookie consent" aria-describedby="cookie-desc" aria-modal="false">
      <div className="cookie-card" ref={cardRef}>
        <div className="cookie-glow" />

        <div className="cookie-header">
          <div className="cookie-title">Vážime si vaše súkromie</div>
        </div>

        <div className="cookie-body" id="cookie-desc">
          Používame nevyhnutné cookies a s vaším súhlasom aj analytické a marketingové.
          Viac v{" "}
          <Link to="/privacy" className="text-primary underline hover:no-underline">zásadách ochrany osobných údajov</Link>.
          Kliknutím na „Prijať všetko“ súhlasíte s ich použitím.
        </div>

        <div className="cookie-actions">
          <button className="cookie-btn cookie-btn--primary" onClick={acceptAll}>
            Prijať všetko
          </button>
          <button className="cookie-btn cookie-btn--outline" onClick={openCustomize}>
            Prispôsobiť
          </button>
          <button className="cookie-btn cookie-btn--ghost" onClick={rejectAll}>
            Odmietnuť
          </button>
        </div>

        {customize && (
          <div className="cookie-panel" role="region" aria-label="Nastavenia cookies">
            <div className="cookie-panel-title">Nastavenia súborov cookie</div>

            <label className="cookie-toggle">
              <input type="checkbox" checked disabled />
              <span className="cookie-toggle-ui" />
              <span className="cookie-toggle-text">
                <span>Nevyhnutné</span>
                <span className="cookie-toggle-muted">Vždy aktívne</span>
              </span>
            </label>

            <label className="cookie-toggle">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
              <span className="cookie-toggle-ui" />
              <span className="cookie-toggle-text">
                <span>Analytické</span>
                <span className="cookie-toggle-muted">Pomáhajú zlepšiť výkon a používanie</span>
              </span>
            </label>

            <label className="cookie-toggle">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span className="cookie-toggle-ui" />
              <span className="cookie-toggle-text">
                <span>Marketingové</span>
                <span className="cookie-toggle-muted">Personalizované reklamy a obsah</span>
              </span>
            </label>

            <div className="cookie-panel-actions">
              <button className="cookie-btn cookie-btn--primary" onClick={saveCustom}>
                Uložiť nastavenia
              </button>
              <button className="cookie-btn cookie-btn--ghost" onClick={() => setCustomize(false)}>
                Zavrieť
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

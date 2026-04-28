import { useEffect, useMemo, useState } from "react";
import { CalendarClock, LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AppSplashScreen } from "@/components/AppSplashScreen";
import { PublicAtmosphereBackground } from "@/components/public/PublicAtmosphereBackground";
import { APP_LOGO_SRC } from "@/lib/branding";
import { useAuth } from "@/contexts/AuthContext";

type AccountPanelKey = "login" | "register" | "history";

type AccountPanelContent = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
  icon: typeof LogIn;
};

type AccountPanelSummary = {
  key: AccountPanelKey;
  label: string;
  description: string;
};

function buildHistoryDescription(isEnglish: boolean, hasUser: boolean): string {
  if (hasUser) {
    return isEnglish
      ? "You are signed in. Open your booking history to review appointments, confirmations and cancellations."
      : "Ste prihlásený. Otvorte si históriu rezervácií a skontrolujte termíny, potvrdenia aj zrušenia.";
  }

  return isEnglish
    ? "Open the client dashboard with your reservation history. If you are not signed in yet, continue to login first."
    : "Otvorte klientsky dashboard so svojou históriou rezervácií. Ak ešte nie ste prihlásený, pokračujte najprv na login.";
}

function buildAccountPanels(isEnglish: boolean, hasUser: boolean): Record<AccountPanelKey, AccountPanelContent> {
  return {
    login: {
      eyebrow: isEnglish ? "Returning client" : "Vracajúci sa klient",
      title: isEnglish ? "Log in" : "Prihlásenie",
      description: isEnglish
        ? "Open your account and continue to booking history, confirmations and booking management."
        : "Otvorte si svoj účet a pokračujte na históriu rezervácií, potvrdenia a správu termínov.",
      actionLabel: isEnglish ? "Go to login" : "Prejsť na login",
      actionPath: "/auth?mode=login",
      icon: LogIn,
    },
    register: {
      eyebrow: isEnglish ? "New client" : "Nový klient",
      title: isEnglish ? "Create account" : "Registrácia",
      description: isEnglish
        ? "Register once and keep your reservations, confirmations and customer details together in one place."
        : "Zaregistrujte sa raz a majte svoje rezervácie, potvrdenia aj klientske údaje prehľadne na jednom mieste.",
      actionLabel: isEnglish ? "Start registration" : "Spustiť registráciu",
      actionPath: "/auth?mode=register",
      icon: UserPlus,
    },
    history: {
      eyebrow: isEnglish ? "Client dashboard" : "Klientsky dashboard",
      title: isEnglish ? "My bookings" : "Moje rezervácie",
      description: buildHistoryDescription(isEnglish, hasUser),
      actionLabel: hasUser
        ? isEnglish
          ? "Open dashboard"
          : "Otvoriť dashboard"
        : isEnglish
          ? "Log in first"
          : "Najprv sa prihlásiť",
      actionPath: hasUser ? "/dashboard/history" : "/auth?mode=login",
      icon: CalendarClock,
    },
  };
}

function buildAccountTabs(isEnglish: boolean): readonly [AccountPanelKey, string][] {
  return [
    ["login", isEnglish ? "Login" : "Prihlásenie"],
    ["register", isEnglish ? "Register" : "Registrácia"],
    ["history", isEnglish ? "My bookings" : "Moje rezervácie"],
  ];
}

function buildAccountSummaries(isEnglish: boolean): AccountPanelSummary[] {
  return [
    {
      key: "login",
      label: isEnglish ? "Secure sign-in" : "Bezpečné prihlásenie",
      description: isEnglish
        ? "Fast access to your customer account and saved reservations."
        : "Rýchly vstup do vášho klientskeho účtu a uložených rezervácií.",
    },
    {
      key: "register",
      label: isEnglish ? "Quick registration" : "Rýchla registrácia",
      description: isEnglish
        ? "Create your account once and keep future bookings organised."
        : "Vytvorte si účet raz a majte budúce rezervácie prehľadne pod kontrolou.",
    },
    {
      key: "history",
      label: isEnglish ? "Booking dashboard" : "Dashboard rezervácií",
      description: isEnglish
        ? "Review appointments, confirmations and cancellations from one client place."
        : "Skontrolujte si termíny, potvrdenia aj zrušenia z jedného klientskeho miesta.",
    },
  ];
}

export default function MyAccountPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [activePanel, setActivePanel] = useState<AccountPanelKey>("login");

  const isEnglish = i18n.language === "en";
  const hasUser = Boolean(user);

  useEffect(() => {
    if (loading) return;
    setActivePanel(hasUser ? "history" : "login");
  }, [hasUser, loading]);

  const panelCopy = useMemo(() => buildAccountPanels(isEnglish, hasUser), [hasUser, isEnglish]);
  const accountTabs = useMemo(() => buildAccountTabs(isEnglish), [isEnglish]);
  const accountSummaries = useMemo(() => buildAccountSummaries(isEnglish), [isEnglish]);

  const currentPanel = panelCopy[activePanel];
  const CurrentIcon = currentPanel.icon;

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black text-foreground safe-x">
      <PublicAtmosphereBackground />

      <div
        className="relative z-10 flex min-h-[100svh] flex-col"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        data-testid="my-account-page"
      >
        <div className="flex flex-1 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 md:pb-10">
          <div className="mx-auto flex w-full max-w-[780px] flex-col">
            <section
              className="public-premium-shell relative mt-10 w-full pb-6 pt-16 backdrop-blur-2xl backdrop-saturate-[120%] sm:mt-12 md:pb-8 md:pt-20"
              data-testid="my-account-hero-shell"
            >
              <div className="public-premium-topglow" aria-hidden="true" />
              <div className="pointer-events-none absolute left-5 top-5 h-8 w-8 rounded-tl-lg border-l border-t border-gold/30" aria-hidden="true" />
              <div className="pointer-events-none absolute right-5 top-5 h-8 w-8 rounded-tr-lg border-r border-t border-gold/30" aria-hidden="true" />
              <div className="pointer-events-none absolute bottom-5 left-5 h-8 w-8 rounded-bl-lg border-b border-l border-gold/30" aria-hidden="true" />
              <div className="pointer-events-none absolute bottom-5 right-5 h-8 w-8 rounded-br-lg border-b border-r border-gold/30" aria-hidden="true" />

              <div
                className="absolute left-1/2 top-0 z-20 h-[92px] w-[92px] -translate-x-1/2 -translate-y-12 overflow-hidden rounded-full bg-ink-100"
                style={{ boxShadow: "var(--shadow-medallion)" }}
                data-testid="my-account-hero-logo"
              >
                <img src={APP_LOGO_SRC} alt="Papi Hair Design" className="h-full w-full object-cover" />
              </div>

              <div className="px-6 text-center md:px-10">
                <p className="mb-3 mt-1 select-none text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-gold/70 sm:text-[11px]">
                  {isEnglish ? "Client zone" : "Klientská zóna"}
                </p>
                <h1
                  className="text-balance text-center text-[30px] font-bold leading-tight tracking-[0.06em] text-text-primary sm:text-[38px] md:text-[44px]"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.80)" }}
                >
                  {isEnglish ? "My account" : "Môj účet"}
                </h1>
                <p className="public-section-copy">
                  {isEnglish
                    ? "Log in, register or continue to your reservation dashboard from one premium client access point."
                    : "Prihláste sa, zaregistrujte sa alebo pokračujte na svoj dashboard rezervácií z jedného prémiového klientskeho vstupu."}
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {accountTabs.map(([key, label]) => {
                    const isActive = activePanel === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActivePanel(key)}
                        className={`min-h-[50px] rounded-[7px] border px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] transition-all duration-200 ${
                          isActive
                            ? "border-[#C9A84C] bg-[#C9A84C] text-black shadow-[0_0_24px_rgba(201,168,76,0.35)]"
                            : "border-white/12 bg-white/[0.02] text-white/75 hover:border-[#C9A84C]/40 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 pt-8 md:px-10">
                <div className="public-premium-panel p-5 sm:p-6">
                  {loading ? (
                    <AppSplashScreen compact testId="my-account-loading-state" />
                  ) : (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
                      <div className="rounded-[24px] border border-gold/12 bg-black/25 p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gold/70">
                          {currentPanel.eyebrow}
                        </p>
                        <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.08em] text-text-primary md:text-4xl">
                          {currentPanel.title}
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-text-caption md:text-base">
                          {currentPanel.description}
                        </p>

                        <button
                          type="button"
                          onClick={() => navigate(currentPanel.actionPath)}
                          className="public-primary-cta group mt-6 inline-flex w-full items-center justify-center gap-3 px-5 py-4 text-sm font-bold uppercase tracking-[0.22em] text-text-primary transition-all duration-200 hover:border-gold/70 hover:from-ink-800 hover:to-ink-600 active:scale-[0.98]"
                          style={{ boxShadow: "var(--shadow-cta-btn)" }}
                        >
                          <CurrentIcon className="h-4 w-4 flex-shrink-0 text-gold" />
                          <span>{currentPanel.actionLabel}</span>
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        {accountSummaries.map((item) => {
                          const isActive = activePanel === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setActivePanel(item.key)}
                              className={`rounded-[7px] border p-4 text-left transition-all duration-200 ${
                                isActive
                                  ? "border-gold/40 bg-gold/[0.08] shadow-[0_0_20px_rgba(201,168,76,0.18)]"
                                  : "border-white/10 bg-black/20 hover:border-gold/30 hover:bg-gold/[0.04]"
                              }`}
                            >
                              <p className="text-sm font-black uppercase tracking-[0.14em] text-text-primary">
                                {item.label}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-text-caption">
                                {item.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

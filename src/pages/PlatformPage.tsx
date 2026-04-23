import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarRange,
  Check,
  Mail,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { APP_BOOKING_EMAIL } from "@/lib/brandConfig";

type PlatformCard = {
  title: string;
  body: string;
};

type PlatformPriceCard = {
  label: string;
  value: string;
  body: string;
};

function useNoIndexPage(title: string) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousTitle = document.title;
    document.title = title;

    const existingRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const robotsMeta = existingRobots ?? document.createElement("meta");
    const previousRobotsContent = robotsMeta.getAttribute("content");

    if (!existingRobots) {
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }

    robotsMeta.setAttribute("content", "noindex,nofollow");

    return () => {
      document.title = previousTitle;

      if (!existingRobots) {
        robotsMeta.remove();
        return;
      }

      if (previousRobotsContent === null) {
        robotsMeta.removeAttribute("content");
        return;
      }

      robotsMeta.setAttribute("content", previousRobotsContent);
    };
  }, [title]);
}

export default function PlatformPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useNoIndexPage(t("platform.metaTitle"));

  const featureCards = useMemo<PlatformCard[]>(
    () => [
      { title: t("platform.features.setupTitle"), body: t("platform.features.setupBody") },
      { title: t("platform.features.bookingTitle"), body: t("platform.features.bookingBody") },
      { title: t("platform.features.opsTitle"), body: t("platform.features.opsBody") },
      { title: t("platform.features.securityTitle"), body: t("platform.features.securityBody") },
    ],
    [t],
  );

  const priceCards = useMemo<PlatformPriceCard[]>(
    () => [
      {
        label: t("platform.pricing.setupLabel"),
        value: t("platform.pricing.setupValue"),
        body: t("platform.pricing.setupBody"),
      },
      {
        label: t("platform.pricing.monthlyLabel"),
        value: t("platform.pricing.monthlyValue"),
        body: t("platform.pricing.monthlyBody"),
      },
      {
        label: t("platform.pricing.pilotLabel"),
        value: t("platform.pricing.pilotValue"),
        body: t("platform.pricing.pilotBody"),
      },
    ],
    [t],
  );

  const contactHref = `mailto:${APP_BOOKING_EMAIL}?subject=${encodeURIComponent(t("platform.mailSubject"))}`;

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.10),transparent_30%),linear-gradient(180deg,#050505_0%,#0b0907_44%,#060505_100%)] px-4 py-8 text-white selection:bg-primary/80 selection:text-black"
      data-testid="platform-page"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78 transition-all hover:border-primary/25 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={16} />
            {t("platform.back")}
          </button>

          <div className="inline-flex min-h-[44px] items-center rounded-full border border-primary/18 bg-primary/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/85">
            {t("platform.badge")}
          </div>
        </div>

        <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_32px_80px_-52px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-8">
          <div className="max-w-4xl space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/80">
              {t("platform.eyebrow")}
            </p>
            <h1 className="text-[2.5rem] font-semibold tracking-tight text-white sm:text-[3.8rem] sm:leading-[0.95]">
              {t("platform.title")}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-white/72 sm:text-lg">
              {t("platform.subtitle")}
            </p>
            <div className="inline-flex max-w-3xl items-start gap-3 rounded-2xl border border-primary/18 bg-primary/[0.08] px-4 py-3 text-sm leading-7 text-white/75">
              <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <span>{t("platform.note")}</span>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <section className="space-y-4">
            <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.08]">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                    {t("platform.whatYouGetEyebrow")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {t("platform.whatYouGetTitle")}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {featureCards.map((card, index) => {
                  const icons = [Building2, CalendarRange, Check, ShieldCheck];
                  const Icon = icons[index] ?? Check;

                  return (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.85)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.08]">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-white/65">{card.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                {t("platform.pricingEyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {t("platform.pricingTitle")}
              </h2>
              <div className="mt-5 space-y-3">
                {priceCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.85)]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/75">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/65">{card.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.9rem] border border-primary/18 bg-[linear-gradient(180deg,rgba(218,165,32,0.12),rgba(218,165,32,0.04))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-white">{t("platform.ctaTitle")}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/72">
                {t("platform.ctaBody")}
              </p>
              <a
                href={contactHref}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#b8860b,#daa520,#f2cf60)] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-black transition-transform hover:scale-[1.01]"
              >
                {t("platform.ctaPrimary")}
              </a>
              <Link
                to="/"
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:border-primary/25 hover:bg-white/[0.06] hover:text-white"
              >
                {t("platform.ctaSecondary")}
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

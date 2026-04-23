import { useEffect, useMemo, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Layers3,
  Mail,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Tags,
  Workflow,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { APP_BOOKING_EMAIL } from "@/lib/brandConfig";
import { PLATFORM_VERTICAL_GROUPS } from "@/lib/platformVerticals";

type PlatformCard = {
  title: string;
  body: string;
};

type PlatformMetric = {
  value: string;
  label: string;
};

type ThemeSwatch = {
  name: string;
  accent: string;
  surface: string;
  ink: string;
};

const METRIC_KEYS = ["launch", "model", "safety"] as const;
const FEATURE_KEYS = ["managed", "booking", "security", "theme"] as const;
const FEATURE_ICONS = [Rocket, CalendarCheck2, ShieldCheck, Palette] as const;
const PRICE_KEYS = ["setup", "retainer", "pilot"] as const;
const STEP_KEYS = ["audit", "configure", "launch"] as const;
const PROOF_KEYS = ["conversion", "mobile", "analytics"] as const;
const PROOF_ICONS = [Zap, Smartphone, BarChart3] as const;
const CONVERSION_KEYS = ["funnel", "retention", "versioning"] as const;

const THEME_SWATCHES: ThemeSwatch[] = [
  { name: "Champagne", accent: "#C9A84C", surface: "#F7F0DF", ink: "#17130B" },
  { name: "Sage", accent: "#78946A", surface: "#EEF3EA", ink: "#132016" },
  { name: "Terracotta", accent: "#B86A48", surface: "#F6E8DE", ink: "#25140E" },
];

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

function PlatformSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#17130b]/10 bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a1f] shadow-[0_16px_44px_-38px_rgba(23,19,11,0.75)]">
      {children}
    </div>
  );
}

export default function PlatformPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useNoIndexPage(t("platform.metaTitle"));

  const metrics = useMemo<PlatformMetric[]>(
    () =>
      METRIC_KEYS.map((key) => ({
        value: t(`platform.metrics.${key}.value`),
        label: t(`platform.metrics.${key}.label`),
      })),
    [t],
  );

  const featureCards = useMemo<PlatformCard[]>(
    () =>
      FEATURE_KEYS.map((key) => ({
        title: t(`platform.features.${key}.title`),
        body: t(`platform.features.${key}.body`),
      })),
    [t],
  );

  const priceCards = useMemo<PlatformCard[]>(
    () =>
      PRICE_KEYS.map((key) => ({
        title: t(`platform.pricing.${key}.title`),
        body: t(`platform.pricing.${key}.body`),
      })),
    [t],
  );

  const launchSteps = useMemo<PlatformCard[]>(
    () =>
      STEP_KEYS.map((key) => ({
        title: t(`platform.launch.${key}.title`),
        body: t(`platform.launch.${key}.body`),
      })),
    [t],
  );

  const proofCards = useMemo<PlatformCard[]>(
    () =>
      PROOF_KEYS.map((key) => ({
        title: t(`platform.proof.${key}.title`),
        body: t(`platform.proof.${key}.body`),
      })),
    [t],
  );

  const conversionCards = useMemo<PlatformCard[]>(
    () =>
      CONVERSION_KEYS.map((key) => ({
        title: t(`platform.conversion.${key}.title`),
        body: t(`platform.conversion.${key}.body`),
      })),
    [t],
  );

  const verticalGroups = useMemo(
    () =>
      PLATFORM_VERTICAL_GROUPS.map((group) => ({
        id: group.id,
        title: t(`platform.verticals.groups.${group.id}.title`),
        body: t(`platform.verticals.groups.${group.id}.body`),
        labels: group.verticals.map((key) => t(`platform.verticals.items.${key}`)),
      })),
    [t],
  );

  const contactHref = `mailto:${APP_BOOKING_EMAIL}?subject=${encodeURIComponent(t("platform.mailSubject"))}`;

  return (
    <div
      className="min-h-screen overflow-hidden bg-[#f7f1e6] text-[#17130b] selection:bg-[#17130b] selection:text-[#f7f1e6]"
      data-testid="platform-page"
    >
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-14rem] top-[-16rem] h-[38rem] w-[38rem] rounded-full bg-[#d8b95d]/34 blur-3xl" />
        <div className="absolute right-[-12rem] top-[13rem] h-[34rem] w-[34rem] rounded-full bg-[#78946a]/26 blur-3xl" />
        <div className="absolute bottom-[-18rem] left-[32%] h-[32rem] w-[32rem] rounded-full bg-[#b86a48]/22 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(23,19,11,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(23,19,11,0.028)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 flex items-center justify-between gap-3 rounded-full border border-[#17130b]/10 bg-[#fdfaf3]/78 px-3 py-3 shadow-[0_22px_70px_-50px_rgba(23,19,11,0.85)] backdrop-blur-2xl">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#17130b] px-4 py-2 text-sm font-semibold text-[#f7f1e6] transition-transform hover:scale-[1.01]"
            type="button"
          >
            <ArrowLeft size={16} />
            {t("platform.back")}
          </button>

          <div className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#17130b]/55 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#78946a]" />
            {t("platform.badge")}
          </div>

          <a
            href={contactHref}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#17130b]/10 bg-white/75 px-4 py-2 text-sm font-semibold text-[#17130b] transition-colors hover:bg-white"
          >
            <Mail size={16} />
            {t("platform.navCta")}
          </a>
        </header>

        <section className="grid min-h-[calc(100svh-5.5rem)] items-center gap-9 py-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(23rem,0.96fr)] lg:py-14">
          <div className="space-y-7">
            <PlatformSectionLabel>
              <Sparkles size={15} />
              {t("platform.eyebrow")}
            </PlatformSectionLabel>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-[clamp(3.35rem,8vw,8.8rem)] font-black leading-[0.9] tracking-[-0.065em] text-[#17130b] sm:leading-[0.82] sm:tracking-[-0.08em]">
                {t("platform.title")}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#352b1b]/76 sm:text-xl">
                {t("platform.subtitle")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={contactHref}
                className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#17130b] px-7 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#f7f1e6] shadow-[0_24px_60px_-36px_rgba(23,19,11,0.9)] transition-transform hover:scale-[1.01]"
              >
                {t("platform.ctaPrimary")}
              </a>
              <Link
                to="/"
                className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-[#17130b]/12 bg-white/64 px-7 py-3 text-sm font-bold text-[#17130b] transition-colors hover:bg-white"
              >
                {t("platform.ctaSecondary")}
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.55rem] border border-[#17130b]/10 bg-white/58 p-4 shadow-[0_20px_56px_-46px_rgba(23,19,11,0.78)] backdrop-blur-xl"
                >
                  <p className="text-2xl font-black tracking-[-0.04em] text-[#17130b]">{metric.value}</p>
                  <p className="mt-1 text-sm leading-5 text-[#352b1b]/65">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2.75rem] border border-[#17130b]/10 bg-[#17130b] p-4 text-[#f7f1e6] shadow-[0_48px_110px_-58px_rgba(23,19,11,0.98)]">
            <div className="rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(216,185,93,0.3),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.035))] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#d8b95d]">
                    {t("platform.signalEyebrow")}
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.055em]">
                    {t("platform.signalTitle")}
                  </h2>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d8b95d] text-[#17130b]">
                  <BadgeCheck size={22} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {featureCards.map((card, index) => {
                  const Icon = FEATURE_ICONS[index] ?? Check;

                  return (
                    <div
                      key={card.title}
                      className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4 transition-colors hover:bg-white/[0.085]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-[#d8b95d]">
                          <Icon size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold">{card.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-[#f7f1e6]/68">{card.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 pb-4 lg:grid-cols-3" aria-labelledby="platform-proof-heading">
          <div className="rounded-[2rem] border border-[#17130b]/10 bg-[#17130b] p-6 text-[#f7f1e6] shadow-[0_24px_70px_-54px_rgba(23,19,11,0.8)] lg:col-span-1">
            <Activity className="h-6 w-6 text-[#d8b95d]" />
            <h2 id="platform-proof-heading" className="mt-5 text-3xl font-black tracking-[-0.06em]">
              {t("platform.proofTitle")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#f7f1e6]/66">{t("platform.proofBody")}</p>
          </div>

          {proofCards.map((card, index) => {
            const Icon = PROOF_ICONS[index] ?? Check;

            return (
              <div
                key={card.title}
                className="rounded-[2rem] border border-[#17130b]/10 bg-white/62 p-6 shadow-[0_24px_70px_-54px_rgba(23,19,11,0.75)] backdrop-blur-xl"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17130b] text-[#f7f1e6]">
                  <Icon size={19} />
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-[-0.05em]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#352b1b]/70">{card.body}</p>
              </div>
            );
          })}
        </section>

        <section
          aria-labelledby="platform-verticals-heading"
          className="mb-4 rounded-[2.5rem] border border-[#17130b]/10 bg-white/64 p-5 shadow-[0_24px_70px_-54px_rgba(23,19,11,0.75)] backdrop-blur-xl sm:p-6 lg:p-8"
        >
          <div className="grid gap-7 lg:grid-cols-[0.58fr_1.42fr] lg:items-start">
            <div>
              <PlatformSectionLabel>
                <Tags size={15} />
                {t("platform.verticals.eyebrow")}
              </PlatformSectionLabel>
              <h2
                id="platform-verticals-heading"
                className="mt-5 max-w-xl text-4xl font-black tracking-[-0.065em] text-[#17130b] sm:text-5xl"
              >
                {t("platform.verticals.title")}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#352b1b]/70 sm:text-base">
                {t("platform.verticals.body")}
              </p>
            </div>

            <div>
              <div className="grid gap-3 md:grid-cols-2" data-testid="platform-vertical-list">
                {verticalGroups.map((group, groupIndex) => (
                  <article
                    key={group.id}
                    className="rounded-[1.75rem] border border-[#17130b]/10 bg-[#fdfaf3] p-4 shadow-[0_18px_48px_-42px_rgba(23,19,11,0.8)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black tracking-[-0.04em]">{group.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[#352b1b]/62">{group.body}</p>
                      </div>
                      <span className="rounded-full bg-[#17130b] px-3 py-1 text-xs font-black text-[#f7f1e6]">
                        {group.labels.length}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.labels.map((label, index) => (
                        <span
                          key={label}
                          data-testid="platform-vertical-chip"
                          className="rounded-full border border-[#17130b]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#352b1b]/76"
                          style={{
                            backgroundColor:
                              (groupIndex + index) % 4 === 0
                                ? "#f7f0df"
                                : (groupIndex + index) % 4 === 1
                                  ? "#eef3ea"
                                  : "#fffaf0",
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-4 rounded-[1.35rem] border border-[#78946a]/20 bg-[#78946a]/10 p-4 text-sm leading-6 text-[#28311f]/76">
                {t("platform.verticals.guardrail")}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2.25rem] border border-[#17130b]/10 bg-white/62 p-6 shadow-[0_24px_70px_-52px_rgba(23,19,11,0.8)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17130b] text-[#f7f1e6]">
                <CircleDollarSign size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a1f]">
                  {t("platform.pricingEyebrow")}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                  {t("platform.pricingTitle")}
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {priceCards.map((card) => (
                <div key={card.title} className="rounded-[1.35rem] border border-[#17130b]/10 bg-[#fdfaf3] p-4">
                  <p className="text-2xl font-black tracking-[-0.04em]">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#352b1b]/68">{card.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-[2.25rem] border border-[#17130b]/10 bg-[#17130b] p-6 text-[#f7f1e6] shadow-[0_24px_70px_-52px_rgba(23,19,11,0.8)]">
              <div className="flex items-center gap-3">
                <Workflow className="h-5 w-5 text-[#d8b95d]" />
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d8b95d]">
                  {t("platform.launchEyebrow")}
                </p>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">
                {t("platform.launchTitle")}
              </h2>
              <div className="mt-6 space-y-4">
                {launchSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d8b95d] text-sm font-black text-[#17130b]">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#f7f1e6]/68">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2.25rem] border border-[#17130b]/10 bg-white/62 p-6 shadow-[0_24px_70px_-52px_rgba(23,19,11,0.8)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17130b] text-[#f7f1e6]">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a1f]">
                    {t("platform.conversionEyebrow")}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                    {t("platform.conversionTitle")}
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {conversionCards.map((card) => (
                  <div key={card.title} className="rounded-[1.25rem] border border-[#17130b]/10 bg-[#fdfaf3] p-4">
                    <h3 className="font-black tracking-[-0.03em]">{card.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#352b1b]/68">{card.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 pb-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2.5rem] border border-[#17130b]/10 bg-white/62 p-6 shadow-[0_24px_70px_-52px_rgba(23,19,11,0.8)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17130b] text-[#f7f1e6]">
                <Layers3 size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a1f]">
                  {t("platform.themeEyebrow")}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                  {t("platform.themeTitle")}
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#352b1b]/68">
              {t("platform.themeBody")}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {THEME_SWATCHES.map((swatch) => (
                <div
                  key={swatch.name}
                  className="rounded-[1.35rem] border border-[#17130b]/10 bg-[#fdfaf3] p-3"
                >
                  <p className="text-sm font-black">{swatch.name}</p>
                  <p className="text-xs text-[#352b1b]/55">{t("platform.themeTokenLabel")}</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="h-8 flex-1 rounded-full border border-[#17130b]/10" style={{ backgroundColor: swatch.accent }} />
                    <span className="h-8 flex-1 rounded-full border border-[#17130b]/10" style={{ backgroundColor: swatch.surface }} />
                    <span className="h-8 flex-1 rounded-full border border-[#17130b]/10" style={{ backgroundColor: swatch.ink }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-[#b86a48]/20 bg-[#b86a48]/10 p-4 text-sm leading-6 text-[#352b1b]/72">
              {t("platform.themeGuardrail")}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2.5rem] border border-[#17130b]/10 bg-[#17130b] p-7 text-[#f7f1e6] shadow-[0_30px_90px_-55px_rgba(23,19,11,0.95)]">
            <div className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-48 w-48 rounded-full bg-[#d8b95d]/25 blur-3xl" />
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d8b95d]">
              {t("platform.finalCta.eyebrow")}
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-black tracking-[-0.07em] sm:text-5xl">
              {t("platform.finalCta.title")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#f7f1e6]/68">{t("platform.finalCta.body")}</p>
            <a
              href={contactHref}
              className="mt-7 inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#d8b95d] px-7 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#17130b] transition-transform hover:scale-[1.01]"
            >
              {t("platform.finalCta.button")}
            </a>
          </section>
        </section>
      </main>
    </div>
  );
}

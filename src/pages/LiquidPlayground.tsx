import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles,
  Clock,
  Euro,
  Calendar,
  Phone,
  MapPin,
  Mail,
  Check,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  useBusinessInfo,
  type OpenStatus,
  type PublicBusinessInfo,
  type NextOpening,
  type BusinessHourEntry,
} from "@/hooks/useBusinessInfo";
import cardBgQr3d from "@/assets/luxury-qr-3d.webp";

const DEMO_BUSINESS_ID = "papi-hair-design-main";
const BOOKING_URL = "https://booking.papihairdesign.sk/booking";
const CONTACT_PHONE = "+421949459624";
const CONTACT_EMAIL = "papihairdesign@gmail.com";
const ADDRESS_PRIMARY = "Tr. SNP 61A";
const ADDRESS_SECONDARY = "Spoločenský pavilón, Košice";
const MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Tr.%20SNP%2061A%2C%20Spolo%C4%8Densk%C3%BD%20pavil%C3%B3n%2C%20Ko%C5%A1ice";
const BRAND_ESTABLISHED = "est. 2018 · Košice";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
const SECTION_META_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/85 sm:text-xs sm:tracking-[0.3em]";
const DETAIL_VALUE_CLASS =
  "text-base font-semibold leading-snug tracking-[0.015em] text-white";
const DETAIL_META_CLASS =
  "text-[11px] font-medium uppercase tracking-[0.12em] text-white/42";
const ACTION_PILL_CLASS =
  "rounded-full border border-primary/15 bg-primary/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90 transition-colors hover:bg-primary/[0.14]";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS_SK: Record<string, string> = {
  monday: "Po",
  tuesday: "Ut",
  wednesday: "St",
  thursday: "Št",
  friday: "Pi",
  saturday: "So",
  sunday: "Ne",
};

const DAY_LABELS_EN: Record<string, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};

interface ServiceItem {
  id: string;
  name_sk: string;
  price: number | null;
}

interface LandingModule {
  id: "brand" | "hours" | "prices" | "booking" | "contact";
  label: string;
  sub: string;
  summary: string;
  Icon: LucideIcon;
  imageSrc?: string;
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatPrice(price: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-IE" : "sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

function getCurrentBusinessDay(timeZone?: string | null) {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: timeZone ?? "Europe/Bratislava",
    })
      .format(new Date())
      .toLowerCase();

    return DAY_ORDER.includes(weekday) ? weekday : null;
  } catch {
    return null;
  }
}

function isDesktopLikeViewport() {
  if (typeof window === "undefined") return false;
  const viewportWidth = window.innerWidth;
  const screenWidth = window.screen?.width ?? viewportWidth;
  const effectiveWidth = Math.max(viewportWidth, screenWidth);
  const hasDesktopInput =
    window.matchMedia("(any-hover: hover)").matches ||
    window.matchMedia("(any-pointer: fine)").matches;
  const isMobileUa =
    /Android|iPhone|iPad|iPod|Mobile|Tablet|Windows Phone/i.test(
      window.navigator.userAgent,
    );

  if (effectiveWidth >= 960) return true;
  if (effectiveWidth < 900) return false;

  return hasDesktopInput && !isMobileUa;
}

function categorizeServices(services: ServiceItem[], t: (key: string) => string) {
  const categories = [
    { label: t("liquid.catWomenHair"), icon: "DI", match: (name: string) => /damsky strih|fukana|finalny styling/i.test(normalizeSearch(name)) },
    { label: t("liquid.catWomenColor"), icon: "FA", match: (name: string) => /farben|kompletne farb/i.test(normalizeSearch(name)) },
    { label: t("liquid.catWomenBalayage"), icon: "BA", match: (name: string) => /balayage|melir/i.test(normalizeSearch(name)) },
    { label: t("liquid.catWomenRegen"), icon: "RE", match: (name: string) => /gumovanie|stahovanie|methamorphyc|keratin/i.test(normalizeSearch(name)) },
    { label: t("liquid.catWomenExtend"), icon: "EX", match: (name: string) => /tape-in|vrkoc|spolocensky/i.test(normalizeSearch(name)) },
    { label: t("liquid.catMenHair"), icon: "PA", match: (name: string) => /junior|pansky strih/i.test(normalizeSearch(name)) },
    { label: t("liquid.catMenBeard"), icon: "BR", match: (name: string) => /brad|kombinacia|special/i.test(normalizeSearch(name)) },
    { label: t("liquid.catMenColor"), icon: "CO", match: (name: string) => /trvala|zosvetlenie|farbenie brady|tonovanie/i.test(normalizeSearch(name)) },
    { label: t("liquid.catExtra"), icon: "EX", match: (name: string) => /depilac|svieck|maska/i.test(normalizeSearch(name)) },
  ];

  const assigned = new Set<string>();
  const groups: { label: string; icon: string; items: ServiceItem[] }[] = [];

  for (const category of categories) {
    const items = services.filter((service) => !assigned.has(service.id) && category.match(service.name_sk));
    items.forEach((service) => assigned.add(service.id));
    if (items.length > 0) groups.push({ label: category.label, icon: category.icon, items });
  }

  const rest = services.filter((service) => !assigned.has(service.id));
  if (rest.length > 0) groups.push({ label: t("liquid.pricesOther"), icon: "OT", items: rest });

  return groups;
}

function getOpenStatusLabel(
  openStatus: OpenStatus | null,
  nextOpening: NextOpening | null,
  t: (key: string) => string,
) {
  if (openStatus?.is_open) return t("liquid.statusOpen");
  if (nextOpening?.time) return `${t("liquid.nextOpening")} ${nextOpening.time.slice(0, 5)}`;
  return t("liquid.statusClosed");
}

function SectionHeading({
  title,
  subtitle,
  centered = false,
}: {
  title: string;
  subtitle: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "space-y-2 text-center" : "space-y-2"}>
      <h2 className="text-[1.85rem] font-bold tracking-tight text-white sm:text-[2.15rem]">
        {title}
      </h2>
      <p className={SECTION_META_CLASS}>
        {subtitle}
      </p>
    </div>
  );
}

function QuickFactCard({
  label,
  value,
  hero = false,
}: {
  label: string;
  value: string;
  hero?: boolean;
}) {
  return (
    <div
      className={`group relative h-full overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] text-left shadow-[0_18px_42px_-34px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 hover:border-primary/22 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))] ${
        hero
          ? "min-h-[92px] p-3.5 min-[360px]:min-h-[96px] min-[360px]:p-4 sm:min-h-[102px] sm:p-[1.125rem]"
          : "p-4"
      }`}
    >
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-70" />
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/52 sm:text-[11px]">
        {label}
      </p>
      <p className={`mt-2 ${DETAIL_VALUE_CLASS}`}>
        {value}
      </p>
    </div>
  );
}

function BrandContent({
  openStatus,
  nextOpening,
  info,
  navigate,
  variant = "section",
}: {
  openStatus: OpenStatus | null;
  nextOpening: NextOpening | null;
  info: PublicBusinessInfo | null;
  navigate: ReturnType<typeof useNavigate>;
  variant?: "hero" | "section";
}) {
  const { t, i18n } = useTranslation();
  const { user, memberships } = useAuth();
  const isRegisteredCustomer = !!user && memberships.some((membership) => membership.role === "customer");
  const isHero = variant === "hero";
  const pricedServices = (info?.services ?? []).filter(
    (service): service is ServiceItem & { price: number } => typeof service.price === "number",
  );
  const cheapestPrice = pricedServices.length ? Math.min(...pricedServices.map((service) => service.price)) : null;
  const openingSummary = getOpenStatusLabel(openStatus, nextOpening, t);
  const phoneNumber = info?.business.phone || t("liquid.contactPhone");
  const todayKey = getCurrentBusinessDay(info?.business.timezone);
  const todaysEntries =
    todayKey == null
      ? []
      : info?.hours
          .filter(
            (entry: BusinessHourEntry) =>
              entry.day_of_week === todayKey && entry.mode === "open",
          )
          .sort((left, right) => left.sort_order - right.sort_order) ?? [];
  const todaysClosingTime =
    todaysEntries.length > 0
      ? todaysEntries[todaysEntries.length - 1].end_time.slice(0, 5)
      : null;
  const modeColors: Record<string, string> = {
    open: "bg-green-500/15 text-green-400 border-green-500/30",
    closed: "bg-red-500/15 text-red-400 border-red-500/30",
    on_request: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const modeLabels: Record<string, string> = {
    open: t("liquid.statusOpen"),
    closed: t("liquid.statusClosed"),
    on_request: t("liquid.statusOnRequest"),
  };
  const dotColors: Record<string, string> = {
    open: "bg-green-500",
    closed: "bg-red-500",
    on_request: "bg-amber-500",
  };
  const trustPoints = [
    t("liquid.heroTrustProducts"),
    t("liquid.heroTrustBooking"),
    ADDRESS_SECONDARY,
  ];
  const quickFacts = [
    { label: t("liquid.cardTime"), value: openingSummary },
    {
      label: t("liquid.cardPrices"),
      value: cheapestPrice != null ? `od ${formatPrice(cheapestPrice, i18n.language)}` : "-",
    },
    { label: t("liquid.cardReserve"), value: "24/7 online" },
    { label: t("liquid.cardDetails"), value: phoneNumber },
  ];

  return (
    <div
      className={`flex h-full flex-col items-center text-center ${
        isHero
          ? "mx-auto max-w-[39rem] justify-between gap-4 px-1 py-2 sm:gap-7 sm:px-3 sm:py-3 xl:max-w-[45rem]"
          : "justify-center gap-8 px-1 sm:px-2"
      }`}
    >
      <div className={isHero ? "grid w-full items-center gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(21rem,0.9fr)] xl:gap-10" : "contents"}>
        <div className={`flex flex-col items-center ${isHero ? "w-full xl:items-start xl:text-left" : ""}`}>
          <div className="relative group">
            <LogoIcon size="lg" className="relative z-10" />
            <div className="absolute inset-0 scale-[1.35] rounded-full bg-primary/14 blur-xl transition-all duration-500 group-hover:bg-primary/20" />
          </div>

          <div className={isHero ? "max-w-[34rem] space-y-2.5 sm:space-y-3.5 xl:max-w-[42rem]" : "space-y-3"}>
            {isHero && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary/82 sm:text-[11px] sm:tracking-[0.3em]">
                {t("liquid.homeEyebrow")}
              </p>
            )}
            <h1 className={`bg-gradient-to-b from-white via-white to-white/60 bg-clip-text font-bold uppercase leading-tight text-transparent ${
              isHero
                ? "text-[2.35rem] tracking-[0.08em] sm:text-[3.75rem] sm:tracking-[0.18em] xl:text-[4.5rem]"
                : "text-5xl tracking-[0.18em] sm:text-7xl"
            }`}>
              PAPI HAIR
            </h1>
            <h2 className={`font-light uppercase text-primary ${isHero ? "-mt-1 text-[15px] tracking-[0.28em] sm:-mt-2 sm:text-[1.7rem] sm:tracking-[0.42em] xl:text-[2rem]" : "-mt-2 text-2xl tracking-[0.4em] sm:text-3xl"}`}>
              DESIGN
            </h2>
            <div className={`h-px w-24 bg-gradient-to-r from-transparent via-primary/80 to-transparent ${isHero ? "mx-auto mt-4 sm:mt-5 xl:mx-0" : "mx-auto mt-6"}`} />
            <p className={`uppercase text-white/50 ${isHero ? "mt-3 text-[11px] tracking-[0.24em] sm:mt-4 sm:text-xs sm:tracking-[0.3em]" : "mt-4 text-xs tracking-[0.3em]"}`}>
              {BRAND_ESTABLISHED}
            </p>
            <p className={`font-medium italic text-amber-200/80 ${isHero ? "mt-1.5 text-[13px] leading-6 tracking-[0.015em] sm:mt-2 sm:text-[15px] sm:leading-7 sm:tracking-[0.03em] xl:max-w-[32rem]" : "mt-2 text-sm tracking-wide"}`}>
              {t("liquid.brandTagline")}
            </p>
            {isHero && (
              <p className="max-w-[34rem] text-sm leading-7 text-white/68 sm:text-[15px]">
                {t("liquid.homeDesc")}
              </p>
            )}
            {isHero && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 xl:justify-start">
                {trustPoints.map((point) => (
                  <span
                    key={point}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72"
                  >
                    {point}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isHero && (
            <div className="mx-auto mt-6 w-full max-w-sm rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.02))] p-4 text-left shadow-[0_26px_62px_-38px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-5 xl:mx-0 xl:max-w-md">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {openStatus && (
                  <div className={`inline-flex items-center rounded-full border font-semibold uppercase backdrop-blur-md ${
                    "gap-2 px-3 py-1.5 text-[10px] tracking-[0.18em] sm:gap-2.5 sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-[0.22em]"
                  } ${modeColors[openStatus.mode] ?? modeColors.closed}`}>
                    <span className={`h-2 w-2 animate-pulse rounded-full ${dotColors[openStatus.mode] ?? dotColors.closed}`} />
                    {modeLabels[openStatus.mode] ?? t("liquid.statusClosed")}
                  </div>
                )}
                {openStatus?.mode === "open" && todaysClosingTime && (
                  <div className="inline-flex items-center rounded-full border border-primary/18 bg-primary/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90">
                    {t("liquid.todayUntil")} {todaysClosingTime}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center gap-3 xl:items-start">
              <Button
                size="lg"
                className={`h-12 w-full rounded-2xl bg-gradient-to-r from-primary via-[#f1cf64] to-primary px-6 font-bold uppercase tracking-[0.22em] text-black shadow-[0_18px_40px_-18px_rgba(218,165,32,0.6)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_20px_44px_-18px_rgba(218,165,32,0.7)] sm:h-14 ${FOCUS_RING}`}
                onClick={() => navigate("/booking")}
              >
                {t("liquid.reserveBtn")}
              </Button>
              {isRegisteredCustomer && (
                <Button
                  size="lg"
                  variant="outline"
                  className={`h-14 w-full rounded-2xl border-white/10 bg-white/[0.03] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-white/[0.05] ${FOCUS_RING}`}
                  onClick={() => navigate("/booking")}
                >
                  {t("liquid.memberBtn")}
                </Button>
              )}
                <p className="w-full text-center text-[11px] leading-6 text-white/56 xl:text-left">
                  {t("liquid.heroCtaNote")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={isHero ? "grid w-full max-w-[38rem] grid-cols-2 gap-3 min-[360px]:gap-3.5 sm:gap-4 xl:ml-auto xl:max-w-[30rem] xl:grid-cols-2 xl:gap-4" : "grid w-full max-w-md grid-cols-2 gap-3"}>
          {quickFacts.map((fact) => (
            <QuickFactCard key={fact.label} label={fact.label} value={fact.value} hero={isHero} />
          ))}
        </div>
      </div>

      {!isHero && (
        <div className="mx-auto mt-4 flex w-full max-w-xs flex-col items-center justify-center gap-4">
          <Button
            size="lg"
            className={`h-14 w-full rounded-2xl bg-gradient-to-r from-primary via-[#f1cf64] to-primary font-bold uppercase tracking-[0.22em] text-black shadow-[0_16px_36px_-18px_rgba(218,165,32,0.55)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_18px_40px_-18px_rgba(218,165,32,0.65)] ${FOCUS_RING}`}
            onClick={() => navigate("/booking")}
          >
            {t("liquid.reserveBtn")}
          </Button>
          {isRegisteredCustomer && (
            <Button
              size="lg"
              variant="outline"
              className={`h-14 w-full rounded-2xl border-white/10 bg-white/[0.03] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-white/[0.05] ${FOCUS_RING}`}
              onClick={() => navigate("/booking")}
            >
              {t("liquid.memberBtn")}
            </Button>
          )}
          {openStatus && (
            <div className={`inline-flex items-center rounded-full border font-semibold uppercase backdrop-blur-md ${
              "gap-2 px-3 py-1.5 text-[10px] tracking-[0.18em]"
            } ${modeColors[openStatus.mode] ?? modeColors.closed}`}>
              <span className={`h-2 w-2 animate-pulse rounded-full ${dotColors[openStatus.mode] ?? dotColors.closed}`} />
              {modeLabels[openStatus.mode] ?? t("liquid.statusClosed")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HoursContent({
  info,
  openStatus,
  nextOpening,
}: {
  info: PublicBusinessInfo | null;
  openStatus: OpenStatus | null;
  nextOpening: NextOpening | null;
}) {
  const { t, i18n } = useTranslation();
  const dayLabels = i18n.language === "en" ? DAY_LABELS_EN : DAY_LABELS_SK;
  const businessTimeZone = info?.business.timezone ?? "Europe/Bratislava";
  const todayKey = getCurrentBusinessDay(businessTimeZone);

  if (!info) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const hoursByDay = DAY_ORDER.map((day) => {
    const entries = info.hours.filter(
      (entry: BusinessHourEntry) => entry.day_of_week === day,
    );

    if (!entries.length) {
      return { day, mode: "closed" as const, isToday: day === todayKey, time: "" };
    }

    const mode = entries[0].mode;
    return {
      day,
      mode,
      isToday: day === todayKey,
      time:
        mode === "open"
          ? entries
              .map(
                (entry: BusinessHourEntry) =>
                  `${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)}`,
              )
              .join(", ")
          : "",
    };
  });
  const todayHours = hoursByDay.find((entry) => entry.day === todayKey);
  const todayClosingTime =
    todayHours?.mode === "open"
      ? todayHours.time.split(", ").at(-1)?.split(" - ").at(-1) ?? null
      : null;

  return (
    <div className="flex h-full flex-col justify-center gap-7 px-2 sm:px-3">
      <SectionHeading title={t("liquid.hoursTitle")} subtitle={t("liquid.hoursSub")} />

      <div className="space-y-1.5">
        {hoursByDay.map(({ day, mode, time, isToday }) => (
          <div
            key={day}
            className={`group flex items-center justify-between rounded-xl border px-3 py-3 transition-all duration-300 last:border-white/5 hover:border-primary/15 hover:bg-white/[0.04] ${
              isToday
                ? "border-primary/20 bg-primary/[0.08] shadow-[0_20px_40px_-34px_rgba(218,165,32,0.65)]"
                : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-10 text-[15px] font-semibold uppercase tracking-[0.18em] transition-colors group-hover:text-white ${
                isToday ? "text-white" : "text-white/60"
              }`}>
                {dayLabels[day]}
              </span>
              {isToday && (
                <span className="rounded-full border border-primary/18 bg-black/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-primary/90">
                  {t("liquid.todayLabel")}
                </span>
              )}
            </div>
            <span
              className={`text-right text-base font-semibold tracking-[0.015em] ${
                mode === "closed"
                  ? "text-red-400/80"
                  : mode === "on_request"
                    ? "italic text-primary"
                    : "text-white"
              }`}
            >
              {mode === "closed"
                ? t("liquid.daysClosed")
                : mode === "on_request"
                  ? t("liquid.daysOnRequest")
                  : time}
            </span>
          </div>
      ))}
      </div>

      {openStatus?.mode === "open" && todayClosingTime && (
        <div className="mt-1 rounded-2xl border border-primary/15 bg-primary/[0.07] p-4 text-center shadow-[0_18px_40px_-34px_rgba(218,165,32,0.5)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("liquid.todayUntil")}
            <span className="ml-1 font-bold text-primary">{todayClosingTime}</span>
          </p>
        </div>
      )}

      {openStatus && !openStatus.is_open && nextOpening && (
        <div className="mt-1 rounded-2xl border border-primary/15 bg-primary/[0.07] p-4 text-center shadow-[0_18px_40px_-34px_rgba(218,165,32,0.5)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("liquid.nextOpening")}
            <span className="ml-1 font-bold text-primary">
              {nextOpening.time?.slice(0, 5)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function PricesContent({ services }: { services: ServiceItem[] }) {
  const { t, i18n } = useTranslation();
  const groups = categorizeServices(services, t);

  if (!groups.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-1 pb-4 sm:px-2">
      <SectionHeading
        title={t("liquid.pricesTitle")}
        subtitle={t("liquid.pricesSub")}
      />

      <div className="grid gap-8">
        {groups.map((group) => (
          <div key={group.label} className="space-y-4">
            <h3 className="flex items-center gap-3 text-[14px] font-bold uppercase tracking-[0.28em] text-primary/80">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.08] text-[11px] font-black tracking-[0.18em] text-primary shadow-[0_10px_20px_-18px_rgba(218,165,32,0.9)]">
                {group.icon}
              </span>
              {group.label}
              <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            </h3>

            <div className="grid gap-3">
              {group.items.map((service) => (
                <div
                  key={service.id}
                  className="group flex items-baseline justify-between rounded-xl border border-white/[0.04] bg-white/[0.015] px-3 py-3 transition-all duration-300 hover:border-primary/10 hover:bg-white/[0.03]"
                >
                  <span className={`${DETAIL_VALUE_CLASS} text-white/72 transition-colors group-hover:text-white`}>
                    {service.name_sk}
                  </span>
                  <div className="mx-4 mb-1 flex-1 border-b border-dotted border-white/10" />
                  <span className="text-lg font-bold tracking-[0.18em] text-white tabular-nums">
                    {service.price != null
                      ? formatPrice(Number(service.price), i18n.language)
                      : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-white/10 pt-8">
        <p className="mx-auto max-w-2xl text-center text-base italic leading-8 text-white/72">
          "V našom kaderníctve v Košiciach veríme, že kvalita služieb a spokojnosť
          klientov sú dôležitejšie než najnižšia cena. Preto používame výhradne
          prémiové produkty Gold Haircare a venujeme dostatok času každej službe
          pre dokonalý výsledok. Naše ceny odrážajú profesionálny prístup,
          skúsenosti kaderníkov a kvalitu materiálov."
        </p>
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground opacity-40">
          {t("liquid.priceNote")}
        </p>
      </div>
    </div>
  );
}

function BookingContent() {
  const { t } = useTranslation();
  const functionalQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(BOOKING_URL)}&bgcolor=000000&color=daa520&format=png`;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-2 text-center sm:px-4">
      <div className="group relative">
        <div className="relative h-56 w-56 overflow-hidden rounded-[2rem] border border-primary/25 bg-black shadow-[0_24px_56px_-30px_rgba(218,165,32,0.52)] transition-transform duration-500 group-hover:-translate-y-1">
          <img
            src={cardBgQr3d}
            alt="PAPI 3D Artwork"
            className="h-full w-full object-cover opacity-40 transition-opacity duration-500 group-hover:opacity-55"
          />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative rounded-[1.4rem] border border-primary/20 bg-gradient-to-br from-primary/30 to-transparent p-1.5 shadow-[0_22px_46px_-24px_rgba(218,165,32,0.6)] backdrop-blur-sm">
              <img
                src={functionalQr}
                alt="Original Scannable PAPI QR"
                className="h-28 w-28 rounded-[1rem] opacity-95 brightness-110 contrast-125"
              />
              <div className="absolute -inset-1 bg-primary/15 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-primary/25 bg-primary/[0.18] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-primary shadow-[0_14px_30px_-20px_rgba(218,165,32,0.7)] backdrop-blur-xl transition-transform duration-300 group-hover:scale-105">
          {t("liquid.scanNow")}
        </div>
      </div>

      <SectionHeading title={t("liquid.bookingTitle")} subtitle={t("liquid.bookingDesc")} centered />

      <Link
        to="/booking"
        className={`group relative inline-flex min-h-12 items-center gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#b8860b,#daa520,#ffd700)] px-8 py-3.5 text-sm font-black uppercase tracking-[0.22em] text-black shadow-[0_20px_45px_-25px_rgba(218,165,32,0.75)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_24px_52px_-24px_rgba(218,165,32,0.8)] active:scale-[0.99] ${FOCUS_RING}`}
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform duration-700 group-hover:translate-x-[100%]" />
        <Calendar className="relative z-10 h-5 w-5" />
        <span className="relative z-10">{t("liquid.bookingBtn")}</span>
      </Link>

      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground opacity-40">
        {t("liquid.bookingQr")}
      </p>
    </div>
  );
}

function ContactContent() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex h-full flex-col gap-7 px-1 sm:px-2">
      <SectionHeading title={t("liquid.contactTitle")} subtitle={t("liquid.contactSub")} />

      <div className="mt-2 grid gap-4">
        <div className="flex items-start gap-4 rounded-[1.35rem] border border-white/5 bg-white/[0.03] p-4 transition-all duration-300 hover:border-primary/20 hover:bg-white/[0.05]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className={DETAIL_VALUE_CLASS}>
              {t("liquid.contactAddr1")}
            </p>
            <p className={`${DETAIL_META_CLASS} mt-1 leading-6 text-white/60`}>
              {t("liquid.contactAddr2")}
            </p>
          </div>
          <span className="ml-auto rounded-full border border-primary/15 bg-primary/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
            {t("liquid.mapTitle")}
          </span>
        </div>

        <div
          className={`group flex min-h-16 items-center gap-4 rounded-[1.35rem] border border-white/5 bg-white/[0.03] p-4 text-left transition-all duration-300 hover:border-primary/30 hover:bg-white/[0.05] ${FOCUS_RING}`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <a
              href={`tel:${CONTACT_PHONE}`}
              className={`${DETAIL_VALUE_CLASS} transition-colors hover:text-primary ${FOCUS_RING}`}
            >
              {t("liquid.contactPhone")}
            </a>
            <p className={`${DETAIL_META_CLASS} mt-1`}>
              {t("liquid.contactPhoneLabel")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${CONTACT_PHONE}`}
              className={`${ACTION_PILL_CLASS} ${FOCUS_RING}`}
            >
              {t("liquid.contactCallAction")}
            </a>
            <button
              type="button"
              onClick={() => copy(CONTACT_PHONE, "phone")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 transition-colors hover:border-primary/20 hover:bg-black/40 ${FOCUS_RING}`}
              aria-label={t("liquid.contactCopyAction")}
            >
              {copied === "phone" ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-white/30 transition-colors group-hover:text-white/50" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`group flex min-h-16 items-center gap-4 rounded-[1.35rem] border border-white/5 bg-white/[0.03] p-4 text-left transition-all duration-300 hover:border-primary/30 hover:bg-white/[0.05] ${FOCUS_RING}`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`${DETAIL_VALUE_CLASS} transition-colors hover:text-primary ${FOCUS_RING}`}
            >
              {t("liquid.contactEmail")}
            </a>
            <p className={`${DETAIL_META_CLASS} mt-1`}>
              {t("liquid.contactEmailLabel")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`${ACTION_PILL_CLASS} ${FOCUS_RING}`}
            >
              {t("liquid.contactEmailAction")}
            </a>
            <button
              type="button"
              onClick={() => copy(CONTACT_EMAIL, "email")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 transition-colors hover:border-primary/20 hover:bg-black/40 ${FOCUS_RING}`}
              aria-label={t("liquid.contactCopyAction")}
            >
              {copied === "email" ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-white/30 transition-colors group-hover:text-white/50" />
              )}
            </button>
          </div>
        </div>
      </div>

      <a
        href={MAP_URL}
        target="_blank"
        rel="noreferrer"
        className={`group relative mt-2 flex flex-col items-center justify-center rounded-[1.75rem] border border-white/10 bg-black/40 p-6 text-center shadow-[0_22px_48px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 hover:border-primary/20 hover:bg-black/55 ${FOCUS_RING}`}
        aria-label={t("liquid.mapTitle")}
      >
        <MapPin className="mb-3 h-8 w-8 text-primary opacity-80 transition-all group-hover:scale-110 group-hover:opacity-100" />
        <h3 className="text-xl font-semibold tracking-[0.08em] text-white">
          {ADDRESS_PRIMARY}
        </h3>
        <p className="mt-1 text-sm font-medium tracking-[0.06em] text-white/50">
          {ADDRESS_SECONDARY}
        </p>
        <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/85">
          {t("liquid.mapTitle")}
        </span>
      </a>
    </div>
  );
}

function AnchorRailButton({
  module,
  isActive,
  isExpanded,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  module: LandingModule;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative flex items-center justify-center rounded-full border transition-all duration-300 ${
        isActive
          ? "border-primary/35 bg-primary/12 text-primary shadow-[0_14px_32px_-24px_rgba(218,165,32,0.55)] scale-[1.04]"
          : "border-white/8 bg-black/55 text-white/55 hover:border-primary/20 hover:bg-black/70 hover:text-white"
      } h-10 w-10 sm:h-11 sm:w-11 ${FOCUS_RING}`}
      aria-label={module.label}
      aria-current={isActive ? "page" : undefined}
      title={module.label}
    >
      {module.imageSrc
        ? <img src={module.imageSrc} alt={module.label} className="h-5 w-5 rounded-full object-cover sm:h-6 sm:w-6" />
        : (
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 sm:h-8 sm:w-8 ${
              isActive
                ? "border-primary/35 bg-primary/16 text-primary"
                : "border-white/8 bg-white/[0.03] text-white/70"
            }`}
          >
            <module.Icon className="h-3 w-3 sm:h-4 sm:w-4" />
          </span>
        )
      }

      {/* Absolute label to prevent layout shift */}
      <span
        className={`pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/80 backdrop-blur-md transition-all duration-200 sm:text-[9px] ${
          isExpanded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        } hidden sm:block`}
      >
        {module.label}
      </span>
    </button>
  );
}

function LandingAnchorSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="grid w-full grid-cols-1 items-start gap-3">
      <div className="w-full rounded-[24px] border border-primary/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.012))] p-1.5 shadow-[0_28px_80px_-56px_rgba(218,165,32,0.24)] sm:rounded-[30px] sm:p-2">
        <div
          className="overflow-hidden rounded-[22px] border border-white/7 bg-[linear-gradient(180deg,rgba(0,0,0,0.62),rgba(0,0,0,0.46))] p-4 sm:rounded-[26px] sm:p-5 lg:p-6"
        >
          <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-primary/18 to-transparent" />
          {children}
        </div>
      </div>
    </section>
  );
}

export default function LiquidPlayground() {
  const [activeSectionId, setActiveSectionId] = useState<LandingModule["id"]>("brand");
  const [expandedNavId, setExpandedNavId] = useState<LandingModule["id"] | null>(null);
  const [desktopLikeLayout, setDesktopLikeLayout] = useState<boolean>(() => isDesktopLikeViewport());
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const sectionRefs = useRef<Partial<Record<LandingModule["id"], HTMLElement | null>>>({});
  const { info, openStatus, nextOpening } = useBusinessInfo(DEMO_BUSINESS_ID);

  const cards: LandingModule[] = [
    {
      id: "brand",
      label: t("liquid.cardLuxury"),
      sub: t("liquid.cardLuxurySub"),
      summary: t("liquid.brandTagline"),
      Icon: Sparkles,
    },
    {
      id: "hours",
      label: t("liquid.cardTime"),
      sub: t("liquid.cardTimeSub"),
      summary: t("liquid.hoursSub"),
      Icon: Clock,
    },
    {
      id: "prices",
      label: t("liquid.cardPrices"),
      sub: t("liquid.cardPricesSub"),
      summary: t("liquid.pricesSub"),
      Icon: Euro,
    },
    {
      id: "booking",
      label: t("liquid.cardReserve"),
      sub: t("liquid.cardReserveSub"),
      summary: t("liquid.bookingDesc"),
      Icon: Calendar,
    },
    {
      id: "contact",
      label: t("liquid.cardDetails"),
      sub: t("liquid.cardDetailsSub"),
      summary: t("liquid.contactSub"),
      Icon: Phone,
    },
  ];
  const activeModule =
    cards.find((card) => card.id === activeSectionId) ?? cards[0];

  const contentMap: Record<LandingModule["id"], React.ReactNode> = {
    brand: (
      <BrandContent
        openStatus={openStatus}
        nextOpening={nextOpening}
        info={info}
        navigate={navigate}
        variant={desktopLikeLayout ? "hero" : "section"}
      />
    ),
    hours: (
      <HoursContent
        info={info}
        openStatus={openStatus}
        nextOpening={nextOpening}
      />
    ),
    prices: <PricesContent services={info?.services ?? []} />,
    booking: <BookingContent />,
    contact: <ContactContent />,
  };

  useEffect(() => {
    const updateLayoutMode = () => setDesktopLikeLayout(isDesktopLikeViewport());
    const handleScroll = () => setScrolled(window.scrollY > 50);

    updateLayoutMode();
    handleScroll();

    window.addEventListener("resize", updateLayoutMode);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", updateLayoutMode);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const elements = cards
      .map((card) => sectionRefs.current[card.id])
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (!visible.length) return;

        const nextId = visible[0].target.getAttribute("data-section-id") as LandingModule["id"] | null;
        if (!nextId) return;
        setActiveSectionId(nextId);
      },
      {
        threshold: [0.2, 0.4, 0.65],
        rootMargin: "-18% 0px -48% 0px",
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (moduleId: LandingModule["id"]) => {
    setActiveSectionId(moduleId);
    setExpandedNavId(moduleId);
    sectionRefs.current[moduleId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="safe-x safe-y relative min-h-screen min-h-[100svh] overflow-x-hidden bg-[#040404] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(218,165,32,0.1),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(255,255,255,0.045),transparent_20%),radial-gradient(circle_at_bottom,rgba(218,165,32,0.06),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/65 to-transparent" />

      <header
        className={`fixed z-50 transition-all duration-500 ${
          scrolled || !desktopLikeLayout
            ? "top-3 left-1/2 w-[94%] -translate-x-1/2 rounded-[2rem] border border-white/10 bg-black/80 py-2 backdrop-blur-2xl shadow-[0_18px_42px_-24px_rgba(0,0,0,0.9)] lg:top-0 lg:w-full lg:translate-x-0 lg:rounded-none lg:bg-black/80 lg:py-2.5"
            : "top-0 left-0 w-full bg-transparent py-6 border-transparent lg:py-4"
        }`}
      >
        <div className="mx-auto grid max-w-[96rem] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-8">
          {/* Left: spacer */}
          <div />

          {/* Center: Navigation */}
          <div className="flex flex-col items-center gap-2">
            <nav
              className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] p-1.5 shadow-[0_18px_32px_-26px_rgba(0,0,0,0.95)] backdrop-blur-md sm:gap-3 lg:gap-6"
              aria-label="Sekcie"
            >
              {cards.map((card) => (
                <AnchorRailButton
                  key={card.id}
                  module={card}
                  isActive={activeSectionId === card.id}
                  isExpanded={expandedNavId === card.id}
                  onClick={() => scrollToSection(card.id)}
                  onMouseEnter={() => setExpandedNavId(card.id)}
                  onMouseLeave={() => setExpandedNavId(null)}
                />
              ))}
            </nav>
            <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-center shadow-[0_18px_34px_-28px_rgba(0,0,0,0.85)] backdrop-blur-md">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                {t("liquid.activeModule")}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                {activeModule.label}
              </span>
              <span className="hidden text-[10px] font-medium text-primary/80 sm:inline">
                {activeModule.sub}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-4">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <button
              onClick={() => navigate("/booking")}
              aria-label={t("liquid.reserveBtn")}
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all duration-300 hover:border-primary/30 hover:bg-white/10 active:scale-95 ${FOCUS_RING}`}
            >
              <Calendar className="h-3.5 w-3.5 text-[#b0b8c1]" />
            </button>
            <div className="sm:hidden">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-none flex-col gap-5 px-2 pb-20 pt-32 sm:px-3 sm:pt-40 lg:max-w-[92rem] lg:px-8">
        <div className="space-y-5 sm:space-y-6 lg:space-y-7">
          {cards.map((card) => (
            <div
              key={card.id}
              id={`section-${card.id}`}
              data-section-id={card.id}
              className="scroll-mt-28 sm:scroll-mt-32"
              ref={(element) => {
                sectionRefs.current[card.id] = element;
              }}
            >
              <LandingAnchorSection>
                {contentMap[card.id]}
              </LandingAnchorSection>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

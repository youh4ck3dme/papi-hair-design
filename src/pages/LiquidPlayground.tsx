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
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import logoIcon from "@/assets/logo-icon.webp";
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

import cardBgQr from "@/assets/luxury-qr.png";
import cardBgQr3d from "@/assets/luxury-qr-3d.png";

const DEMO_BUSINESS_ID = "papi-hair-design-main";

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
  thursday: "St",
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
  const { t } = useTranslation();
  const { user, memberships } = useAuth();
  const isRegisteredCustomer = !!user && memberships.some((membership) => membership.role === "customer");
  const isHero = variant === "hero";
  const pricedServices = (info?.services ?? []).filter(
    (service): service is ServiceItem & { price: number } => typeof service.price === "number",
  );
  const cheapestPrice = pricedServices.length ? Math.min(...pricedServices.map((service) => service.price)) : null;
  const openingSummary = getOpenStatusLabel(openStatus, nextOpening, t);
  const phoneNumber = info?.business.phone || t("liquid.contactPhone");
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
  const quickFacts = [
    { label: t("liquid.cardTime"), value: openingSummary },
    { label: t("liquid.cardPrices"), value: cheapestPrice != null ? `od ${cheapestPrice.toFixed(0)}EUR` : "-" },
    { label: t("liquid.cardReserve"), value: "24/7 online" },
    { label: t("liquid.cardDetails"), value: phoneNumber },
  ];

  return (
    <div
      className={`flex h-full flex-col items-center text-center ${
        isHero
          ? "mx-auto max-w-[38rem] justify-between gap-3 px-2 py-2 sm:gap-6 sm:px-4 sm:py-4 xl:max-w-[44rem]"
          : "justify-center gap-8 px-4"
      }`}
    >
      <div className={isHero ? "grid w-full items-center gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] xl:gap-10" : "contents"}>
        <div className={`flex flex-col items-center ${isHero ? "w-full xl:items-start xl:text-left" : ""}`}>
          <div className="relative group">
            <LogoIcon size="lg" className="relative z-10" />
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl transition-all duration-700 group-hover:bg-primary/30" />
          </div>

          <div className={isHero ? "max-w-[34rem] space-y-2 sm:space-y-3 xl:max-w-[42rem]" : "space-y-3"}>
            <h1 className={`bg-gradient-to-b from-white via-white to-white/60 bg-clip-text font-bold uppercase leading-tight text-transparent ${
              isHero
                ? "text-[2.4rem] tracking-[0.06em] sm:text-6xl sm:tracking-[0.2em] xl:text-7xl"
                : "text-5xl tracking-[0.2em] sm:text-7xl"
            }`}>
              PAPI HAIR
            </h1>
            <h2 className={`font-light uppercase text-primary ${isHero ? "-mt-0.5 text-base tracking-[0.22em] sm:-mt-2 sm:text-3xl sm:tracking-[0.4em] xl:text-[2rem]" : "-mt-2 text-2xl tracking-[0.4em] sm:text-3xl"}`}>
              DESIGN
            </h2>
            <div className={`h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent ${isHero ? "mx-auto mt-4 sm:mt-6 xl:mx-0" : "mx-auto mt-6"}`} />
            <p className={`uppercase text-white/50 ${isHero ? "mt-3 text-[11px] tracking-[0.24em] sm:mt-4 sm:text-xs sm:tracking-[0.3em]" : "mt-4 text-xs tracking-[0.3em]"}`}>
              est. 2018 · Kosice
            </p>
            <p className={`font-medium italic text-amber-200/80 ${isHero ? "mt-1.5 text-[13px] leading-6 tracking-[0.02em] sm:mt-2 sm:text-sm sm:tracking-wide xl:max-w-[32rem]" : "mt-2 text-sm tracking-wide"}`}>
              {t("liquid.brandTagline")}
            </p>
          </div>

          {openStatus && (
            <div className={`inline-flex items-center rounded-full border font-semibold uppercase backdrop-blur-md ${
              isHero ? "mt-5 gap-2 px-3 py-1.5 text-[11px] tracking-[0.22em] sm:gap-3 sm:px-4 sm:py-2 sm:text-xs sm:tracking-widest" : "gap-3 px-4 py-2 text-xs tracking-widest"
            } ${modeColors[openStatus.mode] ?? modeColors.closed}`}>
              <span className={`h-2 w-2 animate-pulse rounded-full ${dotColors[openStatus.mode] ?? dotColors.closed}`} />
              {modeLabels[openStatus.mode] ?? t("liquid.statusClosed")}
            </div>
          )}

          {isHero && (
            <div className="mx-auto mt-5 flex w-full max-w-sm flex-col items-center justify-center gap-3 xl:mx-0 xl:max-w-md xl:items-start">
              <Button
                size="lg"
                className="h-12 w-full rounded-xl bg-gradient-to-r from-primary via-[#ffd700] to-primary font-bold uppercase tracking-widest text-black shadow-[0_10px_30px_-10px_rgba(218,165,32,0.5)] transition-transform hover:scale-[1.02] sm:h-14"
                onClick={() => navigate("/booking")}
              >
                {t("liquid.reserveBtn")}
              </Button>
              {isRegisteredCustomer && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full rounded-xl border-white/10 font-medium uppercase tracking-widest text-white backdrop-blur-sm hover:border-primary/50"
                  onClick={() => navigate("/booking")}
                >
                  {t("liquid.memberBtn")}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className={isHero ? "grid w-full max-w-[38rem] grid-cols-2 gap-3 min-[360px]:gap-3.5 sm:gap-4 xl:ml-auto xl:max-w-none xl:grid-cols-1 xl:gap-4" : "grid w-full max-w-md grid-cols-2 gap-3"}>
          {quickFacts.map((fact) => (
            <div
              key={fact.label}
              className={isHero ? "rounded-xl border border-white/10 bg-black/30 p-3 text-left min-[360px]:min-h-[70px] min-[360px]:rounded-2xl min-[360px]:p-[0.95rem] sm:p-[1.15rem] xl:min-h-[88px]" : "rounded-xl border border-white/10 bg-black/30 p-3 text-left"}
            >
              <p className={isHero ? "text-[10px] uppercase tracking-widest text-white/50 min-[360px]:text-[11px] min-[360px]:tracking-[0.22em] sm:text-xs" : "text-[10px] uppercase tracking-widest text-white/50"}>
                {fact.label}
              </p>
              <p className={isHero ? "mt-1 text-xs font-semibold text-white min-[360px]:mt-1.5 min-[360px]:text-sm min-[360px]:leading-snug sm:text-[15px] xl:text-base" : "mt-1 text-xs font-semibold text-white"}>
                {fact.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!isHero && (
        <div className="mx-auto mt-4 flex w-full max-w-xs flex-col items-center justify-center gap-4">
          <Button
            size="lg"
            className="h-14 w-full rounded-xl bg-gradient-to-r from-primary via-[#ffd700] to-primary font-bold uppercase tracking-widest text-black shadow-[0_10px_30px_-10px_rgba(218,165,32,0.5)] transition-transform hover:scale-[1.02]"
            onClick={() => navigate("/booking")}
          >
            {t("liquid.reserveBtn")}
          </Button>
          {isRegisteredCustomer && (
            <Button
              size="lg"
              variant="outline"
              className="h-14 w-full rounded-xl border-white/10 font-medium uppercase tracking-widest text-white backdrop-blur-sm hover:border-primary/50"
              onClick={() => navigate("/booking")}
            >
              {t("liquid.memberBtn")}
            </Button>
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
      return { day, mode: "closed" as const, time: "" };
    }

    const mode = entries[0].mode;
    return {
      day,
      mode,
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

  return (
    <div className="flex h-full flex-col justify-center gap-6 px-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{t("liquid.hoursTitle")}</h2>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {t("liquid.hoursSub")}
        </p>
      </div>

      <div className="space-y-1">
        {hoursByDay.map(({ day, mode, time }) => (
          <div
            key={day}
            className="group flex items-center justify-between rounded-lg border-b border-white/5 px-2 py-2.5 transition-colors last:border-0 hover:bg-white/[0.02]"
          >
            <span className="w-10 text-sm font-semibold uppercase tracking-widest text-white/60 transition-colors group-hover:text-white">
              {dayLabels[day]}
            </span>
            <span
              className={`text-sm font-medium ${
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

      {openStatus && !openStatus.is_open && nextOpening && (
        <div className="mt-2 rounded-xl border border-primary/10 bg-primary/5 p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
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
  const { t } = useTranslation();
  const groups = categorizeServices(services, t);

  if (!groups.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-2 pb-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Cennik kadernictvo Kosice
        </h2>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Prehlad cien nasich premiovych sluzieb pre damy a panov v PAPI HAIR
          DESIGN Kosice.
        </p>
      </div>

      <div className="grid gap-8">
        {groups.map((group) => (
          <div key={group.label} className="space-y-4">
            <h3 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/8 text-[11px] font-black tracking-[0.18em] text-primary">
                {group.icon}
              </span>
              {group.label}
              <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            </h3>

            <div className="grid gap-3">
              {group.items.map((service) => (
                <div
                  key={service.id}
                  className="group flex items-baseline justify-between"
                >
                  <span className="text-sm font-medium tracking-wide text-white/70 transition-colors group-hover:text-white">
                    {service.name_sk}
                  </span>
                  <div className="mx-4 mb-1 flex-1 border-b border-dotted border-white/5" />
                  <span className="font-bold tracking-widest text-white tabular-nums">
                    {service.price != null
                      ? `${Number(service.price).toFixed(0)}EUR`
                      : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-white/10 pt-8">
        <p className="mx-auto max-w-md text-center text-xs italic leading-relaxed text-white/70">
          "V nasom kadernictve v Kosiciach verime, ze kvalita sluzieb a spokojnost
          klientov je dolezitejsia ako najnizsie ceny. Preto pouzivame vyhradne
          premiove produkty Gold Haircare a venujeme dostatok casu kazdej sluzbe
          pre dokonaly vysledok. Nase ceny odrazaju profesionalny pristup,
          skusenosti nasich kadernikov a kvalitu materialov."
        </p>
        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground opacity-40">
          {t("liquid.priceNote")}
        </p>
      </div>
    </div>
  );
}

function BookingContent() {
  const { t } = useTranslation();
  const qrUrl = "https://booking.papihairdesign.sk/booking";
  const functionalQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}&bgcolor=000000&color=daa520&format=png`;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="group relative perspective-1000">
        <div className="relative h-56 w-56 overflow-hidden rounded-3xl border border-primary/30 bg-black shadow-[0_20px_50px_rgba(218,165,32,0.4)] transition-transform duration-700 group-hover:rotate-y-12">
          <img
            src={cardBgQr3d}
            alt="PAPI 3D Artwork"
            className="h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-60"
          />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/40 to-transparent p-1 shadow-2xl backdrop-blur-sm">
              <img
                src={functionalQr}
                alt="Original Scannable PAPI QR"
                className="h-28 w-28 rounded-xl opacity-90 brightness-110 contrast-125"
              />
              <div className="absolute -inset-1 animate-pulse bg-primary/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-primary/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-primary shadow-lg transition-transform backdrop-blur-xl group-hover:scale-110">
          {t("liquid.scanNow")}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {t("liquid.bookingTitle")}
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary opacity-80">
          {t("liquid.bookingDesc")}
        </p>
      </div>

      <Link
        to="/booking"
        className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl px-10 py-4 text-sm font-black uppercase tracking-[0.2em] text-black shadow-2xl transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #b8860b, #daa520, #ffd700)",
        }}
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
    <div className="flex h-full flex-col gap-6 px-2">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{t("liquid.contactTitle")}</h2>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {t("liquid.contactSub")}
        </p>
      </div>

      <div className="mt-2 grid gap-4">
        <div className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-primary/20">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-white">
              {t("liquid.contactAddr1")}
            </p>
            <p className="text-xs uppercase leading-loose tracking-widest text-white/60">
              {t("liquid.contactAddr2")}
            </p>
          </div>
        </div>

        <button
          onClick={() => copy("+421949459624", "phone")}
          className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-primary/30 hover:bg-white/[0.05]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold tracking-widest text-white">
              {t("liquid.contactPhone")}
            </p>
            <p className="text-xs uppercase tracking-[0.1em] text-white/40">
              {t("liquid.contactPhoneLabel")}
            </p>
          </div>
          {copied === "phone" ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-white/20 transition-colors group-hover:text-white/40" />
          )}
        </button>

        <button
          onClick={() => copy("papihairdesign@gmail.com", "email")}
          className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-primary/30 hover:bg-white/[0.05]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold tracking-widest text-white">
              {t("liquid.contactEmail")}
            </p>
            <p className="text-xs uppercase tracking-[0.1em] text-white/40">
              {t("liquid.contactEmailLabel")}
            </p>
          </div>
          {copied === "email" ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-white/20 transition-colors group-hover:text-white/40" />
          )}
        </button>
      </div>

      <div className="group relative mt-4 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/40 p-6 text-center shadow-2xl backdrop-blur-md transition-all hover:border-primary/20 hover:bg-black/60">
        <MapPin className="mb-3 h-8 w-8 text-primary opacity-80 transition-all group-hover:scale-110 group-hover:opacity-100" />
        <h3 className="text-xl font-bold uppercase tracking-widest text-white">
          Tr. SNP 61A
        </h3>
        <p className="mt-1 text-sm font-medium tracking-wider text-white/50">
          Spolocensky pavilon, Kosice
        </p>
      </div>
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
          ? "border-primary/35 bg-primary/12 text-primary shadow-[0_14px_32px_-24px_rgba(218,165,32,0.55)] scale-110"
          : "border-white/8 bg-black/55 text-white/55 hover:border-primary/20 hover:bg-black/70 hover:text-white"
      } h-9 w-9 sm:h-11 sm:w-11`}
      aria-label={module.label}
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
      <div className="w-full rounded-[24px] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-1.5 shadow-[0_30px_90px_-50px_rgba(218,165,32,0.22)] sm:rounded-[30px] sm:p-2.5">
        <div
          className="overflow-hidden rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(0,0,0,0.62),rgba(0,0,0,0.5))] p-4 sm:rounded-[26px] sm:p-5 lg:p-6"
        >
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(218,165,32,0.12),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_bottom,rgba(218,165,32,0.07),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/65 to-transparent" />

      <header
        className={`fixed z-50 transition-all duration-500 ${
          scrolled || !desktopLikeLayout
            ? "top-3 left-1/2 w-[94%] -translate-x-1/2 rounded-[2rem] border border-white/10 bg-black/80 py-2 backdrop-blur-2xl shadow-2xl lg:top-0 lg:w-full lg:translate-x-0 lg:rounded-none lg:bg-black/80 lg:py-2.5"
            : "top-0 left-0 w-full bg-transparent py-6 border-transparent lg:py-4"
        }`}
      >
        <div className="mx-auto grid max-w-[96rem] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-8">
          {/* Left: spacer */}
          <div />

          {/* Center: Navigation */}
          <div className="flex justify-center">
            <nav
              className="flex items-center gap-1 sm:gap-3 lg:gap-6 rounded-full border border-white/5 bg-white/[0.03] p-1 backdrop-blur-md"
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
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-4">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <button
              onClick={() => navigate("/booking")}
              aria-label={t("liquid.reserveBtn")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all hover:bg-white/10 active:scale-90"
            >
              <Calendar className="text-[#b0b8c1]" style={{ width: 10, height: 10 }} />
            </button>
            <div className="sm:hidden">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-none flex-col gap-4 px-0 pb-20 pt-28 sm:px-2 sm:pt-36 lg:max-w-[96rem] lg:px-8">
        <div className="space-y-3 sm:space-y-4 lg:space-y-5">
          {cards.map((card) => (
            <div
              key={card.id}
              id={`section-${card.id}`}
              data-section-id={card.id}
              className="scroll-mt-28"
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

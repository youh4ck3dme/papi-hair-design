import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
  ShieldCheck,
  Gem,
  Layers3,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
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

import cardBgHero from "@/assets/luxury-hero.png";
import cardBgHow from "@/assets/luxury-hours.png";
import cardBgFeatures from "@/assets/luxury-features.png";
import cardBgQr from "@/assets/luxury-qr.png";
import cardBgAccounts from "@/assets/luxury-accounts.png";
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
  id: keyof typeof cardBgs;
  label: string;
  sub: string;
  summary: string;
  Icon: LucideIcon;
}

const cardBgs = {
  brand: cardBgHero,
  hours: cardBgHow,
  prices: cardBgFeatures,
  booking: cardBgQr,
  contact: cardBgAccounts,
};

const contentAnim = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
}: {
  openStatus: OpenStatus | null;
  nextOpening: NextOpening | null;
  info: PublicBusinessInfo | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useTranslation();
  const { user, memberships } = useAuth();
  const isRegisteredCustomer = !!user && memberships.some((membership) => membership.role === "customer");
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

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="relative group">
        <LogoIcon size="lg" className="relative z-10" />
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl transition-all duration-700 group-hover:bg-primary/30" />
      </div>

      <div className="space-y-3">
        <h1 className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-5xl font-bold uppercase leading-tight tracking-[0.2em] text-transparent sm:text-7xl">
          PAPI HAIR
        </h1>
        <h2 className="-mt-2 text-2xl font-light uppercase tracking-[0.4em] text-primary sm:text-3xl">
          DESIGN
        </h2>
        <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/50">
          est. 2018 · Kosice
        </p>
        <p className="mt-2 text-sm font-medium italic tracking-wide text-amber-200/80">
          {t("liquid.brandTagline")}
        </p>
      </div>

      {openStatus && (
        <div className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest backdrop-blur-md ${modeColors[openStatus.mode] ?? modeColors.closed}`}>
          <span className={`h-2 w-2 animate-pulse rounded-full ${dotColors[openStatus.mode] ?? dotColors.closed}`} />
          {modeLabels[openStatus.mode] ?? t("liquid.statusClosed")}
        </div>
      )}

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-left">
          <p className="text-[10px] uppercase tracking-widest text-white/50">{t("liquid.cardTime")}</p>
          <p className="mt-1 text-xs font-semibold text-white">{openingSummary}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-left">
          <p className="text-[10px] uppercase tracking-widest text-white/50">{t("liquid.cardPrices")}</p>
          <p className="mt-1 text-xs font-semibold text-white">
            {cheapestPrice != null ? `od ${cheapestPrice.toFixed(0)}EUR` : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-left">
          <p className="text-[10px] uppercase tracking-widest text-white/50">{t("liquid.cardReserve")}</p>
          <p className="mt-1 text-xs font-semibold text-white">24/7 online</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-left">
          <p className="text-[10px] uppercase tracking-widest text-white/50">{t("liquid.cardDetails")}</p>
          <p className="mt-1 text-xs font-semibold text-white">{phoneNumber}</p>
        </div>
      </div>

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

function ModuleNavCard({
  module,
  isActive,
  onClick,
  actionLabel,
  activeLabel,
}: {
  module: LandingModule;
  isActive: boolean;
  onClick: () => void;
  actionLabel: string;
  activeLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[28px] border text-left transition-all duration-300 ${
        isActive
          ? "border-primary/55 bg-black/80 shadow-[0_22px_70px_-34px_rgba(218,165,32,0.45)]"
          : "border-white/8 bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04]"
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${cardBgs[module.id]})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/95" />

      <div className="relative flex min-h-[180px] flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#b8860b] via-[#daa520] to-[#ffd700] text-black shadow-[0_0_25px_rgba(218,165,32,0.3)]">
            <module.Icon className="h-5 w-5" />
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
              isActive
                ? "border-primary/40 bg-primary/18 text-primary"
                : "border-white/10 bg-black/35 text-white/45"
            }`}
          >
            {isActive ? activeLabel : actionLabel}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xl font-bold uppercase tracking-[0.16em] text-white">
              {module.label}
            </p>
            <p className="mt-1 text-sm text-white/72">{module.sub}</p>
          </div>
          <p className="max-w-[28ch] text-sm leading-relaxed text-white/54">
            {module.summary}
          </p>
        </div>
      </div>
    </button>
  );
}

function TrustCard({
  Icon,
  title,
  description,
}: {
  Icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[0.025] p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.8)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-[0_0_18px_rgba(218,165,32,0.15)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/58">{description}</p>
    </div>
  );
}

export default function LiquidPlayground() {
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showcaseRef = useRef<HTMLElement | null>(null);
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

  const activeModule = cards[activeCard];
  const pricingServices = (info?.services ?? []).filter(
    (service): service is ServiceItem & { price: number } =>
      typeof service.price === "number",
  );
  const cheapestPrice = pricingServices.length
    ? Math.min(...pricingServices.map((service) => service.price))
    : null;

  const heroFacts = [
    {
      label: t("liquid.cardTime"),
      value: getOpenStatusLabel(openStatus, nextOpening, t),
    },
    {
      label: t("liquid.cardPrices"),
      value: cheapestPrice != null ? `od ${cheapestPrice.toFixed(0)}EUR` : "-",
    },
    {
      label: t("liquid.cardReserve"),
      value: "24/7 online",
    },
  ];

  const trustCards = [
    {
      Icon: Gem,
      title: t("liquid.trustLuxuryTitle"),
      description: t("liquid.trustLuxuryDesc"),
    },
    {
      Icon: ShieldCheck,
      title: t("liquid.trustClarityTitle"),
      description: t("liquid.trustClarityDesc"),
    },
    {
      Icon: Layers3,
      title: t("liquid.trustScaleTitle"),
      description: t("liquid.trustScaleDesc"),
    },
  ];

  const selectCard = (index: number, scrollToShowcase = false) => {
    setActiveCard(index);
    if (!scrollToShowcase) return;
    window.setTimeout(() => {
      showcaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div className="safe-x safe-y relative min-h-[100dvh] overflow-x-hidden bg-[#040404] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(218,165,32,0.12),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_bottom,rgba(218,165,32,0.07),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/65 to-transparent" />

      <div
        className="fixed right-4 top-4 z-50 flex items-center gap-1 safe-right safe-top"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="relative overflow-hidden rounded-[34px] border border-primary/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-[0_25px_80px_-45px_rgba(218,165,32,0.35)] sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(218,165,32,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_45%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                  <LogoIcon size="sm" className="h-4 w-4" />
                  {t("liquid.homeEyebrow")}
                </div>

                <div className="space-y-4">
                  <div>
                    <h1 className="text-4xl font-bold uppercase tracking-[0.18em] text-white sm:text-5xl xl:text-6xl">
                      PAPI HAIR
                    </h1>
                    <p className="mt-2 text-xl font-light uppercase tracking-[0.34em] text-primary sm:text-2xl">
                      DESIGN
                    </p>
                  </div>
                  <p className="max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                    {t("liquid.homeDesc")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {heroFacts.map((fact) => (
                    <div
                      key={fact.label}
                      className="rounded-2xl border border-white/8 bg-black/35 p-4 backdrop-blur-sm"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                        {fact.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">{fact.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 rounded-2xl bg-gradient-to-r from-primary via-[#d9ab2e] to-[#ffd978] px-7 font-bold uppercase tracking-[0.18em] text-black shadow-[0_14px_40px_-18px_rgba(218,165,32,0.6)] hover:scale-[1.01]"
                  onClick={() => navigate("/booking")}
                >
                  {t("liquid.reserveBtn")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-2xl border-white/10 bg-white/[0.02] px-7 font-semibold uppercase tracking-[0.16em] text-white hover:border-primary/35 hover:bg-white/[0.05]"
                  onClick={() => navigate("/papihairsalon2026")}
                >
                  {t("liquid.teamEntryBtn")}
                </Button>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[34px] border border-white/8 bg-black/65 shadow-[0_25px_80px_-50px_rgba(0,0,0,0.9)]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${cardBgs[activeModule.id]})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/55 to-black/95" />

            <div className="relative flex h-full min-h-[360px] flex-col justify-between p-6 sm:p-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {t("liquid.activeModule")}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#b8860b] via-[#daa520] to-[#ffd700] text-black shadow-[0_0_30px_rgba(218,165,32,0.35)]">
                    <activeModule.Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xl font-bold uppercase tracking-[0.16em] text-white">
                      {activeModule.label}
                    </p>
                    <p className="mt-1 text-sm text-white/70">{activeModule.sub}</p>
                  </div>
                </div>

                <p className="max-w-md text-sm leading-7 text-white/58">
                  {activeModule.summary}
                </p>

                <button
                  type="button"
                  onClick={() => selectCard(activeCard, true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:text-[#ffd978]"
                >
                  {t("liquid.moduleAction")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">
              {t("liquid.modulesTitle")}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("liquid.modulesDesc")}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card, index) => (
              <ModuleNavCard
                key={card.id}
                module={card}
                isActive={activeCard === index}
                onClick={() => selectCard(index, true)}
                actionLabel={t("liquid.moduleAction")}
                activeLabel={t("liquid.activeModule")}
              />
            ))}
          </div>
        </section>

        <section
          ref={showcaseRef}
          className="grid scroll-mt-24 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"
        >
          <div className="rounded-[30px] border border-white/8 bg-white/[0.02] p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.9)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/75">
              {t("liquid.showcaseEyebrow")}
            </p>
            <h3 className="mt-3 text-2xl font-bold text-white">
              {activeModule.label}
            </h3>
            <p className="mt-2 text-sm leading-7 text-white/58">
              {t("liquid.showcaseDesc")}
            </p>

            <div className="mt-6 space-y-2">
              {cards.map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => selectCard(index)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    activeCard === index
                      ? "border-primary/45 bg-primary/10 text-white"
                      : "border-white/6 bg-black/30 text-white/65 hover:border-primary/20 hover:text-white"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em]">
                      {card.label}
                    </p>
                    <p className="mt-1 text-xs text-white/45">{card.sub}</p>
                  </div>
                  <card.Icon className="h-4 w-4 text-primary" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-primary/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-2 shadow-[0_30px_90px_-50px_rgba(218,165,32,0.25)] sm:p-3">
            <div className="min-h-[560px] overflow-hidden rounded-[26px] border border-white/6 bg-black/50 p-4 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule.id}
                  className="h-full"
                  initial={contentAnim.initial}
                  animate={contentAnim.animate}
                  exit={contentAnim.exit}
                >
                  {contentMap[activeModule.id]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">
              {t("liquid.trustTitle")}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("liquid.trustDesc")}
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {trustCards.map((card) => (
              <TrustCard
                key={card.title}
                Icon={card.Icon}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[34px] border border-primary/18 bg-[linear-gradient(135deg,rgba(218,165,32,0.12),rgba(255,255,255,0.03),rgba(0,0,0,0.5))] p-6 shadow-[0_25px_80px_-45px_rgba(218,165,32,0.32)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(218,165,32,0.16),transparent_30%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/85">
                CTA
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("liquid.ctaTitle")}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                {t("liquid.ctaDesc")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-14 rounded-2xl bg-gradient-to-r from-primary via-[#d9ab2e] to-[#ffd978] px-7 font-bold uppercase tracking-[0.18em] text-black shadow-[0_14px_40px_-18px_rgba(218,165,32,0.6)] hover:scale-[1.01]"
                onClick={() => navigate("/booking")}
              >
                {t("liquid.reserveBtn")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-2xl border-white/12 bg-black/35 px-7 font-semibold uppercase tracking-[0.16em] text-white hover:border-primary/35 hover:bg-black/45"
                onClick={() => navigate("/papihairsalon2026")}
              >
                {t("liquid.teamEntryBtn")}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

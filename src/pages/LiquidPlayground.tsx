import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Clock, Euro, Calendar, Phone,
  MapPin, Mail, Check, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import { useBusinessInfo, type OpenStatus, type PublicBusinessInfo, type NextOpening, type BusinessHourEntry } from "@/hooks/useBusinessInfo";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import "@/styles/expanding-cards.css";

import cardBgHero from "@/assets/luxury-hero.png";
import cardBgHow from "@/assets/luxury-hours.png";
import cardBgFeatures from "@/assets/luxury-features.png";
import cardBgQr from "@/assets/luxury-qr.png";
import cardBgAccounts from "@/assets/luxury-accounts.png";
import cardBgQr3d from "@/assets/luxury-qr-3d.png";

const DEMO_BUSINESS_ID = "papi-hair-design-main";

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_LABELS_SK: Record<string, string> = {
  monday: "Po", tuesday: "Ut", wednesday: "St",
  thursday: "Št", friday: "Pi", saturday: "So", sunday: "Ne",
};
const DAY_LABELS_EN: Record<string, string> = {
  monday: "Mo", tuesday: "Tu", wednesday: "We",
  thursday: "Th", friday: "Fr", saturday: "Sa", sunday: "Su",
};

interface ServiceItem {
  id: string;
  name_sk: string;
  price: number | null;
}

function categorizeServices(services: ServiceItem[], t: (k: string) => string) {
  const CATEGORIES = [
    { label: t("liquid.catWomenHair"), icon: "💎", match: (n: string) => /dámsky strih|fúkaná|finálny styling/i.test(n) },
    { label: t("liquid.catWomenColor"), icon: "🎨", match: (n: string) => /farben|kompletné farb/i.test(n) },
    { label: t("liquid.catWomenBalayage"), icon: "🌟", match: (n: string) => /balayage|melír/i.test(n) },
    { label: t("liquid.catWomenRegen"), icon: "✨", match: (n: string) => /gumovanie|sťahovanie|methamorphyc|keratín/i.test(n) },
    { label: t("liquid.catWomenExtend"), icon: "👑", match: (n: string) => /tape-in|vrkôč|spoločenský/i.test(n) },
    { label: t("liquid.catMenHair"), icon: "💈", match: (n: string) => /junior|pánsky strih/i.test(n) },
    { label: t("liquid.catMenBeard"), icon: "✂️", match: (n: string) => /brad[ay]|kombinácia|špeciál/i.test(n) },
    { label: t("liquid.catMenColor"), icon: "🖌️", match: (n: string) => /trvalá|zosvetlenie|farbenie brady|tónovanie/i.test(n) },
    { label: t("liquid.catExtra"), icon: "✨", match: (n: string) => /depilác|sviečk|maska/i.test(n) },
  ];
  const assigned = new Set<string>();
  const groups: { label: string; icon: string; items: ServiceItem[] }[] = [];
  for (const cat of CATEGORIES) {
    const items = services.filter((s) => !assigned.has(s.id) && cat.match(s.name_sk));
    items.forEach((s) => assigned.add(s.id));
    if (items.length) groups.push({ label: cat.label, icon: cat.icon, items });
  }
  const rest = services.filter((s) => !assigned.has(s.id));
  if (rest.length) groups.push({ label: t("liquid.pricesOther"), icon: "📋", items: rest });
  return groups;
}

const cardBgs: Record<string, string> = {
  brand: cardBgHero,
  hours: cardBgHow,
  prices: cardBgFeatures,
  booking: cardBgQr,
  contact: cardBgAccounts,
};

const contentAnim: any = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.35, ease: "easeIn" as const } },
};

/* ── Card content components ── */

function BrandContent({ openStatus, navigate }: { openStatus: OpenStatus | null; navigate: ReturnType<typeof useNavigate> }) {
  const { t } = useTranslation();
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
    open: "bg-green-500", closed: "bg-red-500", on_request: "bg-amber-500",
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-4">
      <div className="relative group">
        <LogoIcon size="lg" className="relative z-10" />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 group-hover:bg-primary/30 transition-all duration-700" />
      </div>
      <div className="space-y-3">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-[0.2em] uppercase leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60">
          PAPI HAIR
        </h1>
        <h2 className="text-2xl sm:text-3xl font-light tracking-[0.4em] uppercase text-primary -mt-2">
          DESIGN
        </h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-6" />
        <p className="text-xs mt-4 text-white/50 tracking-[0.3em] uppercase">
          est. 2018 · Košice
        </p>
        <p className="text-sm mt-2 text-amber-200/80 font-medium tracking-wide italic">
          {t("liquid.brandTagline")}
        </p>
      </div>
      {openStatus && (
        <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase border backdrop-blur-md ${modeColors[openStatus.mode] ?? modeColors.closed}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${dotColors[openStatus.mode] ?? dotColors.closed}`} />
          {modeLabels[openStatus.mode] ?? t("liquid.statusClosed")}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-md">
        <Button
          size="lg"
          className="h-14 bg-gradient-to-r from-primary via-[#ffd700] to-primary text-black font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-[0_10px_30px_-10px_rgba(218,165,32,0.5)]"
          onClick={() => navigate("/booking")}
        >
          {t("liquid.reserveBtn")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 border-white/10 hover:border-primary/50 text-white font-medium uppercase tracking-widest rounded-xl backdrop-blur-sm"
          onClick={() => navigate("/auth")}
        >
          {t("liquid.memberBtn")}
        </Button>
      </div>
    </div>
  );
}

function HoursContent({ info, openStatus, nextOpening }: { info: PublicBusinessInfo | null; openStatus: OpenStatus | null; nextOpening: NextOpening | null }) {
  const { t, i18n } = useTranslation();
  const dayLabels = i18n.language === "en" ? DAY_LABELS_EN : DAY_LABELS_SK;

  if (!info) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const hoursByDay = DAY_ORDER.map((day) => {
    const entries = info.hours.filter((h: BusinessHourEntry) => h.day_of_week === day);
    if (!entries.length) return { day, mode: "closed" as const, time: "" };
    const mode = entries[0].mode;
    return {
      day, mode,
      time: mode === "open"
        ? entries.map((e: BusinessHourEntry) => `${e.start_time.slice(0, 5)} – ${e.end_time.slice(0, 5)}`).join(", ")
        : "",
    };
  });

  return (
    <div className="flex flex-col justify-center h-full gap-6 px-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{t("liquid.hoursTitle")}</h2>
        <p className="text-xs text-primary tracking-[0.2em] uppercase font-medium">{t("liquid.hoursSub")}</p>
      </div>

      <div className="space-y-1">
        {hoursByDay.map(({ day, mode, time }) => (
          <div key={day} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors rounded-lg px-2">
            <span className="font-semibold text-sm tracking-widest uppercase text-white/60 group-hover:text-white transition-colors w-10">{dayLabels[day]}</span>
            <span className={`text-sm font-medium ${mode === "closed" ? "text-red-400/80" :
              mode === "on_request" ? "text-primary italic" : "text-white"
              }`}>
              {mode === "closed" ? t("liquid.daysClosed") :
                mode === "on_request" ? t("liquid.daysOnRequest") : time}
            </span>
          </div>
        ))}
      </div>

      {openStatus && !openStatus.is_open && nextOpening && (
        <div className="mt-2 p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
            {t("liquid.nextOpening")} <span className="text-primary font-bold ml-1">{nextOpening.time?.slice(0, 5)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function PricesContent({ services }: { services: ServiceItem[] }) {
  const { t } = useTranslation();
  const groups = categorizeServices(services, t);

  if (!groups.length) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 px-2 pb-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Cenník Kaderníctvo Košice</h2>
        <p className="text-xs text-primary tracking-[0.2em] uppercase font-medium">
          Prehľad cien našich prémiových služieb pre dámy a pánov v PAPI HAIR DESIGN Košice.
        </p>
      </div>

      <div className="grid gap-8">
        {groups.map((g) => (
          <div key={g.label} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-3 text-primary/80">
              <span className="text-lg grayscale">{g.icon}</span>
              {g.label}
              <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            </h3>
            <div className="grid gap-3">
              {g.items.map((svc) => (
                <div key={svc.id} className="flex items-baseline justify-between group">
                  <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors tracking-wide">{svc.name_sk}</span>
                  <div className="flex-1 border-b border-white/5 border-dotted mx-4 mb-1" />
                  <span className="font-bold tabular-nums text-white tracking-widest">
                    {svc.price != null ? `${Number(svc.price).toFixed(0)}€` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-white/10 space-y-4">
        <p className="text-xs text-white/70 leading-relaxed text-center italic max-w-md mx-auto">
          "V našom kaderníctve v Košiciach veríme, že kvalita služieb a spokojnosť klientov je dôležitejšia ako najnižšie ceny. Preto používame výhradne prémiové produkty Gold Haircare a venujeme dostatok času každej službe pre dokonalý výsledok. Naše ceny odrážajú profesionálny prístup, skúsenosti našich kaderníkov a kvalitu materiálov."
        </p>
        <p className="text-[10px] italic text-center text-muted-foreground tracking-widest uppercase opacity-40">
          {t("liquid.priceNote")}
        </p>
      </div>
    </div>
  );
}

function BookingContent() {
  const { t } = useTranslation();
  const qrUrl = "https://papi-hair-design.vercel.app/booking";
  const functionalQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}&bgcolor=000000&color=daa520&format=png`;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-6">
      <div className="relative group perspective-1000">
        <div className="w-56 h-56 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(218,165,32,0.4)] border border-primary/30 bg-black relative transform-gpu group-hover:rotate-y-12 transition-transform duration-700">
          <img
            src={cardBgQr3d}
            alt="PAPI 3D Artwork"
            className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative p-1 rounded-2xl bg-gradient-to-br from-primary/40 to-transparent backdrop-blur-sm border border-primary/20 shadow-2xl">
              <img
                src={functionalQr}
                alt="Original Scannable PAPI QR"
                className="w-28 h-28 rounded-xl opacity-90 brightness-110 contrast-125"
              />
              <div className="absolute -inset-1 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-xl text-[10px] font-bold tracking-[0.3em] uppercase text-primary shadow-lg group-hover:scale-110 transition-transform">
          {t("liquid.scanNow")}
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <h2 className="text-3xl font-bold tracking-tight">{t("liquid.bookingTitle")}</h2>
        <p className="text-[10px] text-primary tracking-[0.3em] uppercase font-bold opacity-80">{t("liquid.bookingDesc")}</p>
      </div>

      <Link
        to="/booking"
        className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-xl text-sm font-black text-black shadow-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #b8860b, #daa520, #ffd700)" }}
      >
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <Calendar className="w-5 h-5 relative z-10" />
        <span className="relative z-10 uppercase tracking-[0.2em]">{t("liquid.bookingBtn")}</span>
      </Link>

      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium opacity-40">
        {t("liquid.bookingQr")}
      </p>
    </div>
  );
}

function ContactContent() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);
  const [mapLit, setMapLit] = useState(false);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col h-full gap-6 px-2">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{t("liquid.contactTitle")}</h2>
        <p className="text-xs text-primary tracking-[0.2em] uppercase font-medium">{t("liquid.contactSub")}</p>
      </div>

      <div className="grid gap-4 mt-2">
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">{t("liquid.contactAddr1")}</p>
            <p className="text-xs text-white/60 uppercase tracking-widest leading-loose">{t("liquid.contactAddr2")}</p>
          </div>
        </div>

        <button
          onClick={() => copy("+421949459624", "phone")}
          className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-white tracking-widest">{t("liquid.contactPhone")}</p>
            <p className="text-xs text-white/40 uppercase tracking-[0.1em]">{t("liquid.contactPhoneLabel")}</p>
          </div>
          {copied === "phone" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/20 group-hover:text-white/40" />}
        </button>

        <button
          onClick={() => copy("papihairdesign@gmail.com", "email")}
          className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-white tracking-widest">{t("liquid.contactEmail")}</p>
            <p className="text-xs text-white/40 uppercase tracking-[0.1em]">{t("liquid.contactEmailLabel")}</p>
          </div>
          {copied === "email" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/20 group-hover:text-white/40" />}
        </button>
      </div>

      <div
        className="mt-4 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group relative"
        style={{ height: "200px" }}
        onMouseEnter={() => setMapLit(true)}
        onMouseLeave={() => setMapLit(false)}
      >
        <div className="absolute inset-0 bg-primary/5 pointer-events-none group-hover:bg-transparent transition-colors z-10" />
        <iframe
          title={t("liquid.mapTitle")}
          src="https://www.openstreetmap.org/export/embed.html?bbox=21.2336%2C48.7168%2C21.2436%2C48.7218&layer=mapnik&marker=48.7193%2C21.2386"
          width="100%"
          height="100%"
          style={{
            border: 0,
            filter: mapLit
              ? "grayscale(0.2) brightness(0.9) contrast(1.1)"
              : "grayscale(1) brightness(0.4) contrast(1.2) invert(1)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          loading="lazy"
        />
      </div>
    </div>
  );
}

/* ── Main ── */

export default function LiquidPlayground() {
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { info, openStatus, nextOpening } = useBusinessInfo(DEMO_BUSINESS_ID);
  const cards = [
    { id: "brand", label: t("liquid.cardLuxury"), sub: t("liquid.cardLuxurySub"), Icon: Sparkles },
    { id: "hours", label: t("liquid.cardTime"), sub: t("liquid.cardTimeSub"), Icon: Clock },
    { id: "prices", label: t("liquid.cardPrices"), sub: t("liquid.cardPricesSub"), Icon: Euro },
    { id: "booking", label: t("liquid.cardReserve"), sub: t("liquid.cardReserveSub"), Icon: Calendar },
    { id: "contact", label: t("liquid.cardDetails"), sub: t("liquid.cardDetailsSub"), Icon: Phone },
  ];

  const contentMap: Record<string, React.ReactNode> = {
    brand: <BrandContent openStatus={openStatus} navigate={navigate} />,
    hours: <HoursContent info={info} openStatus={openStatus} nextOpening={nextOpening} />,
    prices: <PricesContent services={info?.services ?? []} />,
    booking: <BookingContent />,
    contact: <ContactContent />,
  };

  return (
    <div className="bg-background min-h-[100dvh] flex items-center justify-center relative overflow-hidden safe-y safe-x">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1 safe-top safe-right" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="expanding-cards w-full max-w-full px-2 xs:px-3 sm:px-4">
        {cards.map((card, i) => {
          const isActive = activeCard === i;
          return (
            <div
              key={card.id}
              className={`expanding-cards__option ${isActive ? "expanding-cards__option--active" : ""}`}
              onClick={() => setActiveCard(i)}
            >
              <div
                className="expanding-cards__bg"
                style={{ backgroundImage: `url(${cardBgs[card.id]})` }}
              />

              {!isActive && (
                <span className="expanding-cards__collapsed-label">{card.label}</span>
              )}

              <div className="expanding-cards__shadow" />

              <div className="expanding-cards__label">
                <div className="expanding-cards__label-icon">
                  <card.Icon className="w-5 h-5" />
                </div>
                <div className="expanding-cards__label-info">
                  <div className="expanding-cards__label-text expanding-cards__label-main">
                    {card.label}
                  </div>
                  <div className="expanding-cards__label-text expanding-cards__label-sub">
                    {card.sub}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={card.id}
                    className="expanding-cards__content"
                    {...contentAnim}
                  >
                    {contentMap[card.id]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-0 right-0 text-center text-muted-foreground text-xs opacity-40 safe-x safe-bottom" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        © 2026 PAPI HAIR DESIGN · Košice · <Link to="/privacy" className="text-muted-foreground hover:underline">{t("liquid.footerPrivacy")}</Link>
      </div>
    </div>
  );
}

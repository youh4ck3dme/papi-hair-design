import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Clock, Euro, Calendar, Phone,
  MapPin, Mail, Star, Check, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBusinessInfo, type OpenStatus, type PublicBusinessInfo, type NextOpening, type BusinessHourEntry } from "@/hooks/useBusinessInfo";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import "@/styles/expanding-cards.css";

import cardBgHero from "@/assets/luxury-hero.png";
import cardBgHow from "@/assets/luxury-hours.png";
import cardBgFeatures from "@/assets/luxury-features.png";
import cardBgQr from "@/assets/luxury-qr.png";
import cardBgAccounts from "@/assets/luxury-accounts.png";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const DAY_LABELS: Record<string, string> = {
  monday: "Po", tuesday: "Ut", wednesday: "St",
  thursday: "Št", friday: "Pi", saturday: "So", sunday: "Ne",
};
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const CATEGORIES: { label: string; icon: string; match: (name: string) => boolean }[] = [
  { label: "Dámsky – Strih & Styling", icon: "💎", match: (n) => /dámsky strih|fúkaná|finálny styling/i.test(n) },
  { label: "Dámsky – Farbenie", icon: "🎨", match: (n) => /farben|kompletné farb/i.test(n) },
  { label: "Dámsky – Balayage & Melír", icon: "🌟", match: (n) => /balayage|melír/i.test(n) },
  { label: "Dámsky – Regenerácia", icon: "✨", match: (n) => /gumovanie|sťahovanie|methamorphyc|keratín/i.test(n) },
  { label: "Dámsky – Predlžovanie", icon: "👑", match: (n) => /tape-in|vrkôč|spoločenský/i.test(n) },
  { label: "Pánsky – Vlasy", icon: "💈", match: (n) => /junior|pánsky strih/i.test(n) },
  { label: "Pánsky – Brada", icon: " Beard", match: (n) => /brad[ay]|kombinácia|špeciál/i.test(n) },
  { label: "Pánsky – Farbenie", icon: "🖌️", match: (n) => /trvalá|zosvetlenie|farbenie brady|tónovanie/i.test(n) },
  { label: "Doplnkové služby", icon: "✨", match: (n) => /depilác|sviečk|maska/i.test(n) },
];

type ServiceRow = Tables<"services">;
type ServiceItem = Pick<ServiceRow, "id" | "name_sk" | "price">;

function categorizeServices(services: ServiceItem[]) {
  const assigned = new Set<string>();
  const groups: { label: string; icon: string; items: ServiceItem[] }[] = [];
  for (const cat of CATEGORIES) {
    const items = services.filter((s) => !assigned.has(s.id) && cat.match(s.name_sk));
    items.forEach((s) => assigned.add(s.id));
    if (items.length) groups.push({ label: cat.label, icon: cat.icon, items });
  }
  const rest = services.filter((s) => !assigned.has(s.id));
  if (rest.length) groups.push({ label: "Ostatné", icon: "📋", items: rest });
  return groups;
}

const cardBgs: Record<string, string> = {
  brand: cardBgHero,
  hours: cardBgHow,
  prices: cardBgFeatures,
  booking: cardBgQr,
  contact: cardBgAccounts,
};

const cards = [
  { id: "brand", label: "LUXURY", sub: "Salon Experience", Icon: Sparkles },
  { id: "hours", label: "TIME", sub: "Opening Hours", Icon: Clock },
  { id: "prices", label: "PRICES", sub: "Services Menu", Icon: Euro },
  { id: "booking", label: "RESERVE", sub: "Online Booking", Icon: Calendar },
  { id: "contact", label: "DETAILS", sub: "Find us in Košice", Icon: Phone },
];

const contentAnim: any = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.35, ease: "easeIn" as const } },
};

/* ── Card content components ── */

function BrandContent({ openStatus, navigate }: { openStatus: OpenStatus | null; navigate: ReturnType<typeof useNavigate> }) {
  const modeColors: Record<string, string> = {
    open: "bg-green-500/15 text-green-400 border-green-500/30",
    closed: "bg-red-500/15 text-red-400 border-red-500/30",
    on_request: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const modeLabels: Record<string, string> = {
    open: "Otvorené", closed: "Zatvorené", on_request: "Podľa objednávok",
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
        <p className="text-xs mt-4 text-muted-foreground tracking-[0.3em] uppercase opacity-60">
          est. 2018 · Košice
        </p>
        <p className="text-sm mt-2 text-amber-200/80 font-medium tracking-wide italic">
          Official Gold Haircare Slovakia Ambassador
        </p>
      </div>
      {openStatus && (
        <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase border backdrop-blur-md ${modeColors[openStatus.mode] ?? modeColors.closed}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${dotColors[openStatus.mode] ?? dotColors.closed}`} />
          {modeLabels[openStatus.mode] ?? "Zatvorené"}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-md">
        <Button
          size="lg"
          className="h-14 bg-gradient-to-r from-primary via-[#ffd700] to-primary text-black font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-[0_10px_30px_-10px_rgba(218,165,32,0.5)]"
          onClick={() => navigate("/booking")}
        >
          Reserve Your Slot
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 border-white/10 hover:border-primary/50 text-white font-medium uppercase tracking-widest rounded-xl backdrop-blur-sm"
          onClick={() => navigate("/auth")}
        >
          Member Access
        </Button>
      </div>
    </div>
  );
}

function HoursContent({ info, openStatus, nextOpening }: { info: PublicBusinessInfo | null; openStatus: OpenStatus | null; nextOpening: NextOpening | null }) {
  if (!info) return <p className="text-sm text-muted-foreground">Načítavam...</p>;

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
    <div className="flex flex-col justify-center h-full gap-2">
      <h2 className="text-xl font-bold mb-2">Otváracie hodiny</h2>
      {hoursByDay.map(({ day, mode, time }) => (
        <div key={day} className="flex items-center justify-between text-base py-1.5 border-b border-white/5 last:border-0">
          <span className="font-medium text-muted-foreground w-8">{DAY_LABELS[day]}</span>
          <span className={
            mode === "closed" ? "text-red-400" :
              mode === "on_request" ? "text-amber-400" : "text-foreground"
          }>
            {mode === "closed" ? "Zatvorené" :
              mode === "on_request" ? "Podľa objednávok" : time}
          </span>
        </div>
      ))}
      {openStatus && !openStatus.is_open && nextOpening && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Najbližšie otvárame: <span className="text-amber-400 font-medium">{nextOpening.time?.slice(0, 5)}</span>
        </p>
      )}
    </div>
  );
}

function PricesContent({ services }: { services: ServiceItem[] }) {
  const groups = categorizeServices(services);

  if (!groups.length) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 px-2 pb-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Luxury Services</h2>
        <p className="text-xs text-primary tracking-[0.2em] uppercase font-medium">Exquisite Hair Mastery</p>
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
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors tracking-wide">{svc.name_sk}</span>
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

      <div className="pt-6 border-t border-white/5">
        <p className="text-[10px] italic text-center text-muted-foreground tracking-widest uppercase opacity-40">
          Prices are subject to change based on hair length and complexity.
        </p>
      </div>
    </div>
  );
}

function BookingContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/20">
        <Calendar className="w-10 h-10 text-primary" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold tracking-tight">Seamless Booking</h2>
        <p className="text-base text-muted-foreground max-w-xs leading-relaxed">
          Experience effortless scheduling. Choose your therapist, select premium services, and secure your appointment in seconds.
        </p>
      </div>
      <Link
        to="/booking"
        className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-bold text-black shadow-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #b8860b, #daa520, #ffd700)" }}
      >
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <Calendar className="w-5 h-5 relative z-10" />
        <span className="relative z-10 uppercase tracking-widest">Begin Reservation</span>
      </Link>
      <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-primary/30 transition-colors">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.origin + "/booking")}&bgcolor=00000000&color=daa520&format=svg`}
          alt="QR kód"
          className="w-32 h-32 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity"
          loading="lazy"
        />
        <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-[0.2em] font-medium">Scan to Book Anywhere</p>
      </div>
    </div>
  );
}

function ContactContent() {
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
        <h2 className="text-3xl font-bold tracking-tight">Get in Touch</h2>
        <p className="text-xs text-primary tracking-[0.2em] uppercase font-medium">Location & Communication</p>
      </div>

      <div className="grid gap-4 mt-2">
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Trieda SNP 61</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest leading-loose">Spoločenský pavilón, Košice</p>
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
            <p className="text-sm font-bold text-white tracking-widest">+421 949 459 624</p>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em]">WhatsApp & Calls</p>
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
            <p className="text-sm font-bold text-white tracking-widest">papihairdesign@gmail.com</p>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em]">Direct Inquiry</p>
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
          title="Mapa – PAPI HAIR DESIGN"
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
  const { info, openStatus, nextOpening } = useBusinessInfo(DEMO_BUSINESS_ID);
  const [services, setServices] = useState<ServiceItem[]>([]);

  useEffect(() => {
    supabase
      .from("services")
      .select("*")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("is_active", true)
      .order("name_sk")
      .then(({ data }) => setServices(data ?? []));
  }, []);

  const contentMap: Record<string, React.ReactNode> = {
    brand: <BrandContent openStatus={openStatus} navigate={navigate} />,
    hours: <HoursContent info={info} openStatus={openStatus} nextOpening={nextOpening} />,
    prices: <PricesContent services={services} />,
    booking: <BookingContent />,
    contact: <ContactContent />,
  };

  return (
    <div className="bg-background min-h-[100dvh] flex items-center justify-center relative overflow-hidden safe-y safe-x">
      <div className="fixed top-4 right-4 z-50 safe-top safe-right" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
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
        © 2026 PAPI HAIR DESIGN · Košice · <Link to="/privacy" className="text-muted-foreground hover:underline">Zásady ochrany osobných údajov</Link>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_LOGO_SRC } from "@/lib/branding";

interface LandingMainCardProps {
  onOpenPrice: () => void;
}

function useOpenStatus() {
  return useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    const openAt = 8 * 60;
    const closeAt = 17 * 60;

    if (day === 0) {
      return { isOpen: false, label: "Zatvorené" };
    }

    if (day === 6) {
      return { isOpen: false, label: "Na objednávku" };
    }

    if (totalMinutes >= openAt && totalMinutes < closeAt) {
      const closeHour = Math.floor(closeAt / 60);
      const closeMinute = String(closeAt % 60).padStart(2, "0");
      return { isOpen: true, label: `Dnes do ${closeHour}:${closeMinute}` };
    }

    return { isOpen: false, label: totalMinutes < openAt ? "Otvárame o 08:00" : "Zatvorené dnes" };
  }, []);
}

export function LandingMainCard({ onOpenPrice }: LandingMainCardProps) {
  const { isOpen, label } = useOpenStatus();
  const [showPhone, setShowPhone] = useState(false);
  const navigate = useNavigate();

  const goToBooking = () => {
    navigate("/booking");
  };

  return (
    <div
      className="relative mb-6 flex w-full flex-col items-center rounded-3xl border border-border-subtle bg-gradient-to-b from-bg-base/90 to-bg-deep/95 p-6 pt-16 backdrop-blur-2xl backdrop-saturate-[120%] md:p-10"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-40 rounded-t-3xl bg-gradient-to-b from-gold/10 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute left-5 top-5 h-8 w-8 rounded-tl-lg border-l border-t border-gold/30" aria-hidden="true" />
      <div className="pointer-events-none absolute right-5 top-5 h-8 w-8 rounded-tr-lg border-r border-t border-gold/30" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-5 left-5 h-8 w-8 rounded-bl-lg border-b border-l border-gold/30" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-5 right-5 h-8 w-8 rounded-br-lg border-b border-r border-gold/30" aria-hidden="true" />

      <div
        className="absolute left-1/2 top-0 z-20 h-[92px] w-[92px] -translate-x-1/2 -translate-y-12 cursor-default overflow-hidden rounded-full bg-ink-100 transition-transform duration-300 hover:scale-105"
        style={{ boxShadow: "var(--shadow-medallion)" }}
        aria-hidden="true"
      >
        <img src={APP_LOGO_SRC} alt="Papi Hair Design" className="h-full w-full object-cover" />
      </div>

      <p className="mb-4 mt-1 select-none text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-gold/70 sm:text-[11px]">
        Hair Studio &amp; Barber v Košiciach
      </p>

      <h1
        className="text-balance text-center text-[46px] font-bold leading-none tracking-[0.05em] text-text-primary sm:text-[56px] md:text-[64px]"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.80)" }}
      >
        PAPI HAIR
      </h1>

      <h2
        className="mb-5 ml-2 text-center text-[18px] font-semibold uppercase tracking-[0.55em] text-text-gold sm:text-[22px] md:text-[26px]"
        style={{ filter: "drop-shadow(0 0 12px rgba(220,183,115,0.25))" }}
      >
        Design
      </h2>

      <div className="mb-5 flex w-full max-w-xs items-center gap-3">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gold/40" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold/60">Est. 2018 · Košice</span>
        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gold/40" />
      </div>

      <p className="mb-4 px-2 text-center font-serif text-[15px] italic tracking-wide text-text-gold md:text-[16px]">
        Oficiálny ambasádor Gold Haircare na Slovensku
      </p>

      <p className="mb-7 max-w-sm px-2 text-center text-[14px] leading-relaxed text-text-muted md:text-[15px]">
        Precízne strihy, farbenie a barber služby s online rezerváciou bez čakania.
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-2.5">
        {["Gold Haircare", "Rezervácia 24/7", "Spoločenský pavilón, Košice"].map((text) => (
          <span
            key={text}
            className="select-none rounded-full border border-gold/30 bg-gold/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-label sm:text-[12px]"
          >
            {text}
          </span>
        ))}
      </div>

      <div
        className="mb-6 w-full rounded-2xl border border-border-subtle bg-gradient-to-b from-bg-cta/80 to-bg-deep/90 p-5 md:p-6"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className="relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.15em]"
            style={{
              background: "linear-gradient(to bottom, var(--status-open-deep), var(--status-open-dark))",
              border: "1px solid rgba(34,197,94,0.50)",
              color: "var(--status-open)",
              boxShadow: "var(--shadow-open-badge)",
            }}
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{
                background: isOpen ? "var(--status-open-bg)" : "var(--status-closed)",
                boxShadow: isOpen ? "0 0 6px var(--status-open-bg)" : "0 0 6px var(--status-closed)",
              }}
              aria-hidden="true"
            />
            <span>{isOpen ? "Otvorené" : "Zatvorené"}</span>
          </div>

          <div className="rounded-full border border-gold/40 bg-gold/[0.05] px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-text-gold">
            {label}
          </div>
        </div>

        <button
          onClick={goToBooking}
          className="group relative w-full overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-b from-ink-600 to-ink-500 py-4 text-[15px] font-bold uppercase tracking-[0.22em] text-text-primary transition-all duration-200 hover:border-gold/70 hover:from-ink-800 hover:to-ink-600 active:scale-[0.98] sm:text-[16px]"
          style={{ boxShadow: "var(--shadow-cta-btn)" }}
          type="button"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gold" aria-hidden="true">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
            Rezervovať termín
          </span>
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
        </button>

        <p className="mt-3 text-center text-[12px] leading-relaxed text-text-caption">
          Vyberiete službu, termín aj člena tímu za pár minút a bez zbytočného čakania.
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        <button
          onClick={onOpenPrice}
          className="group flex flex-col items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.05] p-3 transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.10] active:scale-95 md:p-4"
          aria-label="Zobraziť cenník"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-flip text-gold" aria-hidden="true">
            <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
            <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-label sm:text-[12px]">Cenník</span>
        </button>

        <button
          onClick={goToBooking}
          className="group flex flex-col items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.05] p-3 transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.10] active:scale-95 md:p-4"
          aria-label="Online rezervácia"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-bounce text-gold" aria-hidden="true">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <path d="m9 16 2 2 4-4" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-label sm:text-[12px]">Rezervácia</span>
        </button>

        {showPhone ? (
          <a
            href="tel:+421949459624"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gold/55 bg-gold/[0.10] p-3 transition-all duration-200 active:scale-95 md:p-4"
            aria-label="Zavolať +421 949 459 624"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-status-open" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="whitespace-nowrap text-center text-[10px] font-bold leading-tight tracking-wide text-status-open">
              +421 949 459 624
            </span>
          </a>
        ) : (
          <button
            onClick={() => setShowPhone(true)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.05] p-3 transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.10] active:scale-95 md:p-4"
            aria-label="Zobraziť telefónne číslo"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-wiggle text-gold" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-label sm:text-[12px]">Kontakt</span>
          </button>
        )}
      </div>
    </div>
  );
}

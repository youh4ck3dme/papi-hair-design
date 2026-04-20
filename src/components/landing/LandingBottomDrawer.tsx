import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { LandingDrawerType } from "./types";

interface LandingBottomDrawerProps {
  open: LandingDrawerType;
  onClose: () => void;
}

const priceList = [
  { label: "Pánsky strih", price: "25 EUR", note: "Nožnice alebo strojček" },
  { label: "Úprava brady (Hot towel)", price: "15 EUR", note: "Vrátane horúceho uteráka" },
  { label: "Komplet (Strih + Brada)", price: "35 EUR", note: "Najobľúbenejšia kombinácia" },
  { label: "Umytie a styling", price: "5 EUR", note: "Šampón + kondicionér" },
  { label: "Farbenie", price: "od 30 EUR", note: "Cena závisí od dĺžky" },
  { label: "Melír / Balayage", price: "od 50 EUR", note: "Konzultácia zdarma" },
];

export function LandingBottomDrawer({ open, onClose }: LandingBottomDrawerProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isVisible = open !== null;

  const openBooking = () => {
    onClose();
    navigate("/booking");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cenník služieb"
      className={`fixed inset-0 z-[200] flex items-end justify-center transition-all duration-500 ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/65 transition-all duration-500 ${isVisible ? "backdrop-blur-sm" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex max-h-[88dvh] w-full max-w-[780px] flex-col rounded-t-3xl border-t border-gold/40 bg-gradient-to-b from-bg-drawer to-bg-deep transition-transform duration-500 ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          boxShadow: "var(--shadow-drawer)",
          transitionTimingFunction: "cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-gold/30" />
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-b border-gold/15 px-6 pb-4 pt-4 md:px-8">
          <div>
            <h3 className="text-xl font-bold tracking-wide text-text-primary md:text-2xl">Cenník Služieb</h3>
            <p className="mt-0.5 text-[12px] tracking-wide text-text-caption">
              Papi Hair Design · Košice
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavrieť"
            className="rounded-full border border-gold/25 bg-bg-elevated p-2.5 text-gold transition-all hover:border-gold/50 hover:bg-ink-800 active:scale-95"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 md:px-8">
          <div>
            <div className="mb-6 space-y-2">
              {priceList.map((item, index) => (
                <div
                  key={item.label}
                  className="flex cursor-default items-center justify-between gap-4 rounded-xl border border-gold/[0.12] bg-gold/[0.04] p-4 transition-all hover:border-gold/25 hover:bg-gold/[0.08]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 flex-shrink-0 text-[10px] font-bold text-gold/50">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[14px] font-semibold leading-snug text-warm-100 md:text-[15px]">
                        {item.label}
                      </span>
                    </div>
                    <p className="ml-6 mt-0.5 text-[12px] text-text-note">{item.note}</p>
                  </div>
                  <span className="flex-shrink-0 text-[15px] font-bold text-text-gold md:text-[16px]">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-gold/20 bg-gold/[0.06] p-4">
              <p className="text-[13px] leading-snug text-text-hint">
                Chcete si rezervovať termín?
              </p>
              <button
                className="flex-shrink-0 rounded-lg px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black transition-all active:scale-95"
                style={{
                  background: "linear-gradient(to bottom, var(--gold-300), var(--gold-500))",
                  boxShadow: "var(--shadow-gold-btn)",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = "var(--shadow-gold-btn-hover)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = "var(--shadow-gold-btn)";
                }}
                onClick={openBooking}
                type="button"
              >
                Rezervovať
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

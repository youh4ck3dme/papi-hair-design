import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingData } from "@/hooks/useBookingData";
import { ServicePriceCatalog } from "@/components/pricing/ServicePriceCatalog";
import type { LandingDrawerType } from "./types";

interface LandingBottomDrawerProps {
  open: LandingDrawerType;
  onClose: () => void;
}

export function LandingBottomDrawer({ open, onClose }: LandingBottomDrawerProps) {
  const navigate = useNavigate();
  const { services, initialLoading } = useBookingData();
  const isVisible = open !== null;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isVisible, onClose]);

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
        className={`relative flex max-h-[min(90dvh,840px)] w-full max-w-[780px] flex-col overflow-hidden rounded-t-[30px] border border-gold/20 bg-gradient-to-b from-bg-drawer via-bg-surface to-bg-deep transition-all duration-500 md:mb-6 md:rounded-[30px] ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{
          boxShadow: "var(--shadow-drawer)",
          transitionTimingFunction: "cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-5 top-0 h-24 rounded-t-[28px] bg-gradient-to-b from-gold/12 via-gold/[0.04] to-transparent"
          aria-hidden="true"
        />

        <div className="flex flex-shrink-0 justify-center pb-1 pt-3" aria-hidden="true">
          <div className="h-1.5 w-12 rounded-full bg-gold/28 shadow-[0_0_16px_rgba(220,183,115,0.2)]" />
        </div>

        <div className="relative flex flex-shrink-0 items-start justify-between border-b border-gold/12 px-5 pb-4 pt-4 md:px-8 md:pb-5">
          <div className="pr-4">
            <p className="mb-2 inline-flex rounded-full border border-gold/15 bg-gold/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/85">
              Papi Hair Design · Košice
            </p>
            <h3 className="text-[22px] font-bold leading-tight tracking-[0.02em] text-text-primary md:text-[28px]">
              Cenník služieb
            </h3>
            <p className="mt-1.5 max-w-[34rem] text-[13px] leading-relaxed text-text-muted md:text-[14px]">
              Vyberte si službu a pozrite si orientačné ceny v prehľadnom, mobilne prívetivom drawer flowe.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavrieť"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-gold/20 bg-bg-elevated/90 text-gold transition-all hover:border-gold/50 hover:bg-ink-800 active:scale-95"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 md:px-8 md:pb-6">
          <ServicePriceCatalog services={services} initialLoading={initialLoading} variant="drawer" />
        </div>

        <div
          className="relative flex flex-shrink-0 flex-col gap-3 border-t border-gold/12 bg-gradient-to-b from-bg-surface/92 to-bg-deep/98 px-5 pb-[max(20px,calc(env(safe-area-inset-bottom)+12px))] pt-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-8"
        >
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold/80">
              Online rezervácia
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-muted md:text-[14px]">
              Keď ste pripravení, jedným klikom pokračujete priamo do rezervácie bez ďalšieho hľadania.
            </p>
          </div>
          <button
            className="min-h-11 flex-shrink-0 rounded-[10px] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-black transition-all active:scale-95 md:px-6"
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
            Rezervovať termín
          </button>
        </div>
      </div>
    </div>
  );
}

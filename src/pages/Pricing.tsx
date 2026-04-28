
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ServicePriceCatalog } from "@/components/pricing/ServicePriceCatalog";
import { usePricingData } from "@/hooks/usePricingData";

export default function Pricing() {
  const { services, initialLoading } = usePricingData();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.10),transparent_30%),linear-gradient(180deg,#080706_0%,#0d0b09_48%,#060505_100%)] px-4 pb-16 pt-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/")}
          className="mb-8 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gold/18 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gold transition-all hover:border-gold/42 hover:bg-gold/[0.06] active:scale-95"
        >
          <ArrowLeft size={16} /> Späť na domov
        </button>

        <div className="mb-10 text-center">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.34em] text-gold/78">
            PAPI HAIR DESIGN
          </p>
          <h1 className="text-4xl font-black uppercase leading-tight text-text-primary md:text-6xl">
            Cenník služieb
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-text-caption md:text-base">
            Toto je živý cenník napojený na služby spravované v admin sekcii. Zobrazuje
            pánske, dámske aj doplnkové služby v rovnakej logike, ako ich používa booking flow.
          </p>
        </div>

        <ServicePriceCatalog services={services} initialLoading={initialLoading} />
      </div>
    </div>
  );
}

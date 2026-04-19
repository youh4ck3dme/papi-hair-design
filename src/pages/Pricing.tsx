
import { useState } from "react";
import { Check, Loader2, Rocket, Shield, Zap, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { auth } from "@/integrations/firebase/config";
import { createCheckoutSession } from "@/integrations/firebase/createCheckoutSession";

const plans = [
  {
    name: "Free",
    price: "0€",
    description: "Pre jednotlivcov na vyskúšanie.",
    features: [
      "5 AI správ denne",
      "Prístup k základnému modelu",
      "História chatu (24h)",
      "Základná podpora"
    ],
    cta: "Začať zadarmo",
    highlight: false,
    color: "bg-white"
  },
  {
    name: "Pro",
    price: "19€",
    priceId: "price_1Ov_pro_monthly",
    description: "Pre náročných vývojárov.",
    features: [
      "Neobmedzené AI správy",
      "Prístup k GPT-4o-mini",
      "Neobmedzená história",
      "Prémiová podpora",
      "MCP Tooling integrácia"
    ],
    cta: "Prejsť na Pro",
    highlight: true,
    color: "bg-yellow-400"
  },
  {
    name: "Enterprise",
    price: "49€",
    priceId: "price_1Ov_ent_monthly",
    description: "Škálovateľné riešenie pre tímy.",
    features: [
      "Všetko z balíka Pro",
      "Tímové zdieľanie relácií",
      "Garantovaná dostupnosť (SLA)",
      "Vlastné MCP servery",
      "Školenie tímu"
    ],
    cta: "Kontaktovať predaj",
    highlight: false,
    color: "bg-red-600 text-white"
  }
];

export default function Pricing() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubscribe = async (priceId: string | undefined, planName: string) => {
    if (!priceId) {
        if (planName === "Free") {
            navigate("/booking");
            return;
        }
        toast.error("Tento balík momentálne vyžaduje asistenciu predaja.");
        return;
    }

    setLoadingId(planName);
    try {
      if (!auth.currentUser) {
        toast.error("Najprv sa musíte prihlásiť pre nákup predplatného.");
        navigate("/auth");
        return;
      }

      const { url, disabled, message } = await createCheckoutSession({ price_id: priceId });
      if (disabled || !url) {
        throw new Error(message || "Predplatné je momentálne nedostupné.");
      }

      if (url) {
        window.location.assign(url);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Nastala chyba pri inicializácii platby.";
      toast.error(errorMessage);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white py-20 px-4 font-sans selection:bg-black selection:text-white">
      <div className="max-w-7xl mx-auto mb-16 relative">
        <button 
           onClick={() => navigate("/")}
           className="absolute -top-12 left-0 flex items-center gap-2 font-black uppercase text-sm hover:text-red-600 transition-colors"
        >
           <ArrowLeft size={16} /> Späť
        </button>
        <div className="text-center">
            <h1 className="text-5xl md:text-8xl font-black text-black mb-4 uppercase leading-none">
              Vyberte si svoj <br />
              <span className="text-red-600 underline decoration-black decoration-8 underline-offset-8">Arsenal.</span>
            </h1>
            <p className="text-black font-bold text-lg max-w-2xl mx-auto mt-8 border-l-4 border-black pl-4 text-left md:text-center md:border-l-0">
              Bez kompromisov. Bez skrytých poplatkov. Čistý výkon pre váš biznis.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-6xl mx-auto border-4 border-black">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative p-10 border-b-4 md:border-b-0 md:border-r-4 last:border-r-0 border-black ${plan.color} flex flex-col transition-all group`}
          >
            {plan.highlight && (
              <div className="absolute top-0 right-0 bg-black text-white px-4 py-1 text-xs font-black uppercase tracking-widest border-l-4 border-b-4 border-black">
                PRO CHOICE
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-6xl font-black tracking-tight">{plan.price}</span>
                <span className="font-bold uppercase text-xs opacity-70">/ mesiac</span>
              </div>
              <p className="font-bold leading-tight">{plan.description}</p>
            </div>

            <div className="flex-1 space-y-3 mb-12">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span className="font-bold text-sm uppercase tracking-wide">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(plan.priceId, plan.name)}
              disabled={loadingId !== null}
              className={`w-full py-5 px-6 border-4 border-black font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                plan.highlight
                  ? "bg-black text-white hover:bg-white hover:text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-x-1 active:translate-y-1"
                  : "bg-white text-black hover:bg-black hover:text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-x-1 active:translate-y-1"
              } disabled:opacity-50`}
            >
              {loadingId === plan.name ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                plan.cta
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-24 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-yellow-400 border-4 border-black flex items-center justify-center">
             <Shield className="w-8 h-8" />
          </div>
          <p className="font-black uppercase text-sm">STRIPE SECURITY</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-600 border-4 border-black flex items-center justify-center text-white">
             <Zap className="w-8 h-8" />
          </div>
          <p className="font-black uppercase text-sm">INSTANT ACTIVATION</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-black border-4 border-black flex items-center justify-center text-white">
             <Rocket className="w-8 h-8" />
          </div>
          <p className="font-black uppercase text-sm">CANCEL ANYTIME</p>
        </div>
      </div>
    </div>
  );
}

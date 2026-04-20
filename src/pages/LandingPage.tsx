import { useCallback, useState } from "react";
import { LandingBottomDrawer } from "@/components/landing/LandingBottomDrawer";
import { LandingInstallPrompt } from "@/components/landing/LandingInstallPrompt";
import { LandingMainCard } from "@/components/landing/LandingMainCard";
import { LandingOpeningHours } from "@/components/landing/LandingOpeningHours";
import { LandingSplashScreen } from "@/components/landing/LandingSplashScreen";
import { LandingTopNav } from "@/components/landing/LandingTopNav";
import type { LandingDrawerType } from "@/components/landing/types";

export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false);
  const [drawer, setDrawer] = useState<LandingDrawerType>(null);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  const openDrawer = useCallback((type: Exclude<LandingDrawerType, null>) => {
    setDrawer(type);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
  }, []);

  return (
    <main className="relative h-[100svh] overflow-hidden bg-black text-white md:min-h-screen">
      {!splashDone && <LandingSplashScreen onFinish={handleSplashFinish} />}

      <div
        className={`relative flex h-[100svh] flex-col items-center justify-center overflow-hidden px-4 transition-opacity duration-700 md:min-h-screen ${
          splashDone ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div
          className="animate-ken-burns fixed inset-0 z-0 origin-center bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80')",
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.80), rgba(24,18,12,0.80), rgba(0,0,0,0.90))",
            backdropFilter: "blur(8px)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full max-w-[780px] flex-col items-center justify-center gap-4 md:gap-5">
          <LandingTopNav onOpenPrice={() => openDrawer("cennik")} />
          <div className="mt-6 w-full md:mt-8">
            <LandingMainCard onOpenPrice={() => openDrawer("cennik")} />
          </div>
          <LandingOpeningHours />
        </div>
      </div>

      <LandingBottomDrawer open={drawer} onClose={closeDrawer} />
      <LandingInstallPrompt visible={splashDone && drawer === null} />
    </main>
  );
}

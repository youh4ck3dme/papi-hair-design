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
    <main className="relative min-h-[100svh] overflow-hidden bg-black text-white md:min-h-screen">
      {!splashDone && <LandingSplashScreen onFinish={handleSplashFinish} />}

      <div
        className={`relative flex min-h-[100svh] flex-col overflow-hidden transition-opacity duration-700 md:min-h-screen ${
          splashDone ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
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

        <div className="relative z-10 flex min-h-[100svh] flex-col">
          <div className="px-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
            <div className="mx-auto max-w-[780px]">
              <LandingTopNav onOpenPrice={() => openDrawer("cennik")} />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 pb-6 sm:px-6">
            <div className="flex w-full max-w-[780px] flex-col items-center justify-center gap-4 md:gap-5">
              <div className="w-full md:mt-2">
                <LandingMainCard onOpenPrice={() => openDrawer("cennik")} />
              </div>
              <LandingOpeningHours />
            </div>
          </div>
        </div>
      </div>

      <LandingBottomDrawer open={drawer} onClose={closeDrawer} />
      <LandingInstallPrompt visible={splashDone && drawer === null} />
    </main>
  );
}

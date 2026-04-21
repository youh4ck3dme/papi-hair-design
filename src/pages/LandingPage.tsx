import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { LandingInstallPrompt } from "@/components/landing/LandingInstallPrompt";
import { LandingMainCard } from "@/components/landing/LandingMainCard";
import { LandingOpeningHours } from "@/components/landing/LandingOpeningHours";
import { LandingSplashScreen } from "@/components/landing/LandingSplashScreen";
import { LandingTopNav } from "@/components/landing/LandingTopNav";
import { PublicAtmosphereBackground } from "@/components/public/PublicAtmosphereBackground";
import type { LandingDrawerType } from "@/components/landing/types";

const LandingBottomDrawer = lazy(async () => {
  const module = await import("@/components/landing/LandingBottomDrawer");
  return { default: module.LandingBottomDrawer };
});

export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false);
  const [drawer, setDrawer] = useState<LandingDrawerType>(null);
  const [drawerLoaded, setDrawerLoaded] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  const openDrawer = useCallback((type: Exclude<LandingDrawerType, null>) => {
    setDrawer(type);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
  }, []);

  useEffect(() => {
    if (drawer !== null) {
      setDrawerLoaded(true);
    }
  }, [drawer]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black text-white md:min-h-screen">
      {!splashDone && <LandingSplashScreen onFinish={handleSplashFinish} />}

      <div
        className={`relative flex min-h-[100svh] flex-col overflow-hidden transition-opacity duration-700 md:min-h-screen ${
          splashDone ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
          paddingBottom: splashDone
            ? "max(116px, calc(env(safe-area-inset-bottom) + 92px))"
            : "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <PublicAtmosphereBackground />

        <div className="relative z-10 flex min-h-[100svh] flex-col">
          <div className="px-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
            <div className="mx-auto max-w-[780px]">
              <LandingTopNav onOpenPrice={() => openDrawer("cennik")} />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 pb-6 sm:px-6">
            <div className="flex w-full max-w-[780px] flex-col items-center justify-center gap-4 md:gap-5">
              <div className="mt-14 w-full md:mt-2">
                <LandingMainCard onOpenPrice={() => openDrawer("cennik")} />
              </div>
              <LandingOpeningHours />
            </div>
          </div>
        </div>
      </div>

      {drawerLoaded ? (
        <Suspense fallback={null}>
          <LandingBottomDrawer open={drawer} onClose={closeDrawer} />
        </Suspense>
      ) : null}
      <LandingInstallPrompt visible={splashDone && drawer === null} />
    </main>
  );
}

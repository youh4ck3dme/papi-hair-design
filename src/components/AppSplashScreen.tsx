import { Loader2 } from "lucide-react";

import { APP_LOGO_SRC } from "@/lib/branding";
import { cn } from "@/lib/utils";

type AppSplashScreenProps = {
  className?: string;
  compact?: boolean;
  testId?: string;
};

export function AppSplashScreen({
  className,
  compact = false,
  testId = "app-splash-screen",
}: AppSplashScreenProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-black text-foreground",
        compact ? "min-h-[220px] rounded-2xl" : "min-h-[100dvh]",
        className,
      )}
      role="status"
      aria-label="Načítava sa"
      data-testid={testId}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(214,178,94,0.16),transparent_34%),linear-gradient(180deg,#050505_0%,#0b0907_100%)]"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-gold/30 bg-ink-100 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <img src={APP_LOGO_SRC} alt="" className="h-full w-full object-cover" aria-hidden="true" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden="true" />
      </div>
    </div>
  );
}

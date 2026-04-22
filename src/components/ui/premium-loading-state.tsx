import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type PremiumLoadingStateProps = {
  title: string;
  description: string;
  eyebrow?: string;
  variant?: "public" | "admin";
  compact?: boolean;
  className?: string;
  testId?: string;
};

export function PremiumLoadingState({
  title,
  description,
  eyebrow,
  variant = "public",
  compact = false,
  className,
  testId,
}: Readonly<PremiumLoadingStateProps>) {
  return (
    <div
      className={cn(
        variant === "public"
          ? "public-premium-panel border-gold/18 bg-[linear-gradient(180deg,rgba(12,10,8,0.92),rgba(27,20,14,0.82))]"
          : "admin-premium-subtle",
        "flex flex-col items-center justify-center text-center",
        compact ? "min-h-[220px] px-5 py-10" : "min-h-[280px] px-6 py-12 sm:px-8",
        className,
      )}
      data-testid={testId}
    >
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-full border",
          variant === "public"
            ? "border-gold/30 bg-gold/[0.08] text-gold"
            : "border-primary/20 bg-primary/10 text-primary",
        )}
        aria-hidden="true"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      {eyebrow && (
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.28em]",
            variant === "public" ? "text-gold/70" : "text-primary/70",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "mt-3 text-balance text-xl font-bold",
          variant === "public" ? "text-text-primary" : "text-foreground",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-3 max-w-xl text-sm leading-7",
          variant === "public" ? "text-white/72" : "text-muted-foreground",
        )}
      >
        {description}
      </p>
    </div>
  );
}

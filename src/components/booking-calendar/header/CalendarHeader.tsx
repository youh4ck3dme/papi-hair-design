import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CalendarHeader({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col border-b border-border shrink-0 booking-calendar-header",
        compact ? "gap-2 p-2.5 md:p-3" : "gap-3 p-3 md:p-4",
      )}
    >
      {children}
    </div>
  );
}

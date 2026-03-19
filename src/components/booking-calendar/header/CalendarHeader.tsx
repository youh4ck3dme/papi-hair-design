import type { ReactNode } from "react";

export function CalendarHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-3 md:p-4 border-b border-border shrink-0 booking-calendar-header">
      {children}
    </div>
  );
}

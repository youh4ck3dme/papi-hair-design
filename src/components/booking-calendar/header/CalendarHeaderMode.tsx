import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBookingCalendarContext } from "../calendar-context";
import { CALENDAR_MODES, type BookingCalendarMode } from "../calendar-types";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";

const MODE_LABELS: Record<BookingCalendarMode, string> = {
  day: "Deň",
  week: "Týždeň",
  month: "Mesiac",
};

const MODE_ICONS: Record<BookingCalendarMode, React.ReactNode> = {
  day: <Calendar className="h-4 w-4" />,
  week: <CalendarRange className="h-4 w-4" />,
  month: <CalendarDays className="h-4 w-4" />,
};

export function CalendarHeaderMode() {
  const { mode, setMode } = useBookingCalendarContext();

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(v) => v && setMode(v as BookingCalendarMode)}
      className="w-full rounded-lg border border-border overflow-hidden bg-muted/30 p-0.5 gap-0.5"
    >
      {CALENDAR_MODES.map((m) => {
        const isActive = mode === m;
        return (
          <ToggleGroupItem
            key={m}
            value={m}
            className={[
              "flex-1 rounded-md border-0 transition-all duration-200 relative overflow-hidden",
              isActive
                ? "bg-[#D4AF37] text-black font-bold shadow-[0_0_12px_rgba(212,175,55,0.5)] scale-[1.03]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            {isActive && (
              <span className="absolute inset-0 animate-pulse bg-[#D4AF37]/20 rounded-md pointer-events-none" />
            )}
            <span className="flex items-center gap-1.5 relative z-10">
              {MODE_ICONS[m]}
              {MODE_LABELS[m]}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

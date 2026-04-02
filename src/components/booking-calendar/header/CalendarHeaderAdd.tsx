import { addMinutes, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useBookingCalendarContext } from "../calendar-context";
import { CALENDAR_START_HOUR } from "../calendar-types";
import { cn } from "@/lib/utils";

export function CalendarHeaderAdd() {
  const { date, mode, onSelectSlot, selectable } = useBookingCalendarContext();
  const showMonthFloatingAction = mode === "month";

  const handleAdd = () => {
    if (!selectable || !onSelectSlot) return;
    const start = startOfDay(date);
    start.setHours(CALENDAR_START_HOUR, 0, 0, 0);
    const end = addMinutes(start, 30);
    onSelectSlot({ start, end });
  };

  if (!selectable) return null;

  return (
    <>
      <Button
        size="sm"
        onClick={handleAdd}
        className={cn(
          "w-full sm:w-auto bg-gold text-gold-foreground hover:bg-gold/90 border-0 focus-visible:ring-gold",
          showMonthFloatingAction && "hidden sm:inline-flex",
        )}
        aria-label="Pridať novú rezerváciu na vybraný deň"
      >
        <Plus className="h-4 w-4 mr-1" aria-hidden />
        Nová rezervácia
      </Button>
      {showMonthFloatingAction ? (
        <Button
          type="button"
          size="icon"
          onClick={handleAdd}
          className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-2xl bg-gold text-gold-foreground shadow-[0_12px_32px_hsl(var(--gold)/0.45)] sm:hidden"
          aria-label="Rýchlo pridať rezerváciu"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Button>
      ) : null}
    </>
  );
}

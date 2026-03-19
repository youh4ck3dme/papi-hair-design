import { addMinutes, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useBookingCalendarContext } from "../calendar-context";
import { CALENDAR_START_HOUR } from "../calendar-types";

export function CalendarHeaderAdd() {
  const { date, onSelectSlot, selectable } = useBookingCalendarContext();

  const handleAdd = () => {
    if (!selectable || !onSelectSlot) return;
    const start = startOfDay(date);
    start.setHours(CALENDAR_START_HOUR, 0, 0, 0);
    const end = addMinutes(start, 30);
    onSelectSlot({ start, end });
  };

  if (!selectable) return null;

  return (
    <Button
      size="sm"
      onClick={handleAdd}
      className="w-full sm:w-auto bg-gold text-gold-foreground hover:bg-gold/90 border-0 focus-visible:ring-gold"
      aria-label="Pridať novú rezerváciu na vybraný deň"
    >
      <Plus className="h-4 w-4 mr-1" aria-hidden />
      Nová rezervácia
    </Button>
  );
}

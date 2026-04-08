import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from "date-fns";
import { sk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBookingCalendarContext } from "../calendar-context";
import { cn } from "@/lib/utils";

export function CalendarHeaderDate() {
  const { mode, date, setDate } = useBookingCalendarContext();
  const isMonthMode = mode === "month";

  const handleBack = () => {
    if (mode === "month") setDate(subMonths(date, 1));
    else if (mode === "week") setDate(subWeeks(date, 1));
    else setDate(subDays(date, 1));
  };

  const handleForward = () => {
    if (mode === "month") setDate(addMonths(date, 1));
    else if (mode === "week") setDate(addWeeks(date, 1));
    else setDate(addDays(date, 1));
  };

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 md:h-8 md:w-8 shrink-0 hover:bg-gold/10 hover:border-gold/50 hover:text-gold"
        onClick={handleBack}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span
        className={cn(
          "flex-1 truncate text-sm font-semibold text-foreground",
          isMonthMode ? "text-left text-base md:text-sm" : "text-center",
        )}
      >
        {format(date, isMonthMode ? "LLLL yyyy" : "d. MMMM yyyy", { locale: sk })}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 md:h-8 md:w-8 shrink-0 hover:bg-gold/10 hover:border-gold/50 hover:text-gold"
        onClick={handleForward}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { startOfWeek, addDays } from "date-fns";
import { useBookingCalendarContext } from "../calendar-context";
import { CalendarBodyMargin } from "./CalendarBodyMargin";
import { CalendarBodyDayContent } from "./CalendarBodyDayContent";
import { CALENDAR_START_HOUR } from "../calendar-types";

export function CalendarBodyWeek() {
  const { date, pixelsPerHour } = useBookingCalendarContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - CALENDAR_START_HOUR) * pixelsPerHour;
    }
  }, [pixelsPerHour]);

  return (
    <div className="flex divide-x divide-border flex-grow overflow-hidden min-h-0">
      <div className="flex flex-col flex-grow divide-y divide-border overflow-hidden min-h-0">
        <div ref={scrollRef} className="flex flex-col flex-1 overflow-y-auto min-h-0">
          <div className="relative flex flex-1 divide-x divide-border min-h-0 flex-col md:flex-row">
            <CalendarBodyMargin className="hidden md:block" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="flex flex-1 divide-x divide-border md:divide-x-0 min-w-0"
              >
                <CalendarBodyMargin className="block md:hidden" />
                <CalendarBodyDayContent date={day} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { useBookingCalendarContext } from "../calendar-context";
import { CalendarBodyMargin } from "./CalendarBodyMargin";
import { CalendarBodyDayContent } from "./CalendarBodyDayContent";
import { CALENDAR_START_HOUR } from "../calendar-types";

export function CalendarBodyDay() {
  const { date, resources, pixelsPerHour } = useBookingCalendarContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - CALENDAR_START_HOUR) * pixelsPerHour;
    }
  }, [pixelsPerHour]);

  return (
    <div className="flex divide-x divide-border flex-grow overflow-hidden min-h-0">
      <div className="flex flex-col flex-grow divide-y divide-border overflow-hidden min-h-0">
        <div ref={scrollRef} className="flex flex-col flex-1 overflow-y-auto min-h-0">
          <div className="relative flex flex-1 divide-x divide-border min-h-0">
            <CalendarBodyMargin />
            {resources?.length ? (
              resources.map((res) => (
                <div key={res.id} className="flex-1 basis-0 min-w-0 flex flex-col border-r border-border last:border-r-0">
                  <div className="relative flex-1">
                    <CalendarBodyDayContent date={date} resourceId={res.id} resourceName={res.display_name} />
                  </div>
                </div>
              ))
            ) : (
              <CalendarBodyDayContent date={date} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

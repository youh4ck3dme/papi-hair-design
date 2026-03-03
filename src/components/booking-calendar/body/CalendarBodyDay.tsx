import { useBookingCalendarContext } from "../calendar-context";
import { CalendarBodyMargin } from "./CalendarBodyMargin";
import { CalendarBodyDayContent } from "./CalendarBodyDayContent";
import { CalendarBodyHeader } from "./CalendarBodyHeader";

export function CalendarBodyDay() {
  const { date, resources } = useBookingCalendarContext();

  return (
    <div className="flex divide-x divide-border flex-grow overflow-hidden min-h-0">
      <div className="flex flex-col flex-grow divide-y divide-border overflow-hidden min-h-0">
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
          <div className="relative flex flex-1 divide-x divide-border min-h-0">
            <CalendarBodyMargin />
            {resources?.length ? (
              resources.map((res) => (
                <div key={res.id} className="flex-1 flex flex-col min-w-[200px] border-r border-border last:border-r-0">
                  <CalendarBodyHeader date={date} resourceName={res.display_name} />
                  <div className="relative flex-1">
                    <CalendarBodyDayContent date={date} resourceId={res.id} />
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

import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";
import type { SlotInfo } from "./calendar-context";
import { BookingCalendarProvider } from "./BookingCalendarProvider";
import { CalendarHeader } from "./header/CalendarHeader";
import { CalendarHeaderDate } from "./header/CalendarHeaderDate";
import { CalendarHeaderMode } from "./header/CalendarHeaderMode";
import { CalendarHeaderAdd } from "./header/CalendarHeaderAdd";
import { CalendarHeaderSearch } from "./header/CalendarHeaderSearch";
import { CalendarBody } from "./body/CalendarBody";

export interface BookingCalendarProps {
  events: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
  selectable?: boolean;
  businessHours?: any;
  resources?: any[];
}



export function BookingCalendar({
  events,
  date,
  setDate,
  mode,
  setMode,
  onSelectSlot,
  onSelectEvent,
  selectable = false,
  businessHours,
  resources,
}: BookingCalendarProps) {
  return (
    <BookingCalendarProvider
      events={events}
      date={date}
      setDate={setDate}
      mode={mode}
      setMode={setMode}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      selectable={selectable}
      businessHours={businessHours}
      resources={resources}
    >


      <div className="flex flex-col h-full min-h-0 booking-calendar">
        <CalendarHeader>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(210px,1fr)_minmax(320px,1.2fr)_auto] lg:items-center">
            <CalendarHeaderDate />
            <CalendarHeaderSearch />
            <CalendarHeaderAdd />
          </div>
          <CalendarHeaderMode />
        </CalendarHeader>
        <CalendarBody />
      </div>
    </BookingCalendarProvider>
  );
}

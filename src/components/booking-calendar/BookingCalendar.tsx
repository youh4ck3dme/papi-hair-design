import type { ReactNode } from "react";
import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";
import type { SlotInfo } from "./calendar-context";
import { BookingCalendarProvider } from "./BookingCalendarProvider";
import { CalendarHeader } from "./header/CalendarHeader";
import { CalendarHeaderDate } from "./header/CalendarHeaderDate";
import { CalendarHeaderMode } from "./header/CalendarHeaderMode";
import { CalendarHeaderAdd } from "./header/CalendarHeaderAdd";
import { CalendarZoomControls } from "./header/CalendarZoomControls";
import { CalendarBody } from "./body/CalendarBody";
import { cn } from "@/lib/utils";

export interface BookingCalendarProps {
  events: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
  onLongPressSlot?: (slot: SlotInfo) => void;
  onLongPressEvent?: (event: BookingCalendarEvent) => void;
  selectable?: boolean;
  businessHours?: any;
  resources?: any[];
  headerActions?: ReactNode;
}



export function BookingCalendar({
  events,
  date,
  setDate,
  mode,
  setMode,
  onSelectSlot,
  onSelectEvent,
  onLongPressSlot,
  onLongPressEvent,
  selectable = false,
  businessHours,
  resources,
  headerActions,
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
      onLongPressSlot={onLongPressSlot}
      onLongPressEvent={onLongPressEvent}
      selectable={selectable}
      businessHours={businessHours}
      resources={resources}
      >


      <div className="flex flex-col h-full min-h-0 booking-calendar">
        <CalendarHeader compact={mode === "month"}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-3">
            {/* Mobile Row 1 (Date) / Desktop Left */}
            <div className="flex items-center justify-center lg:justify-start w-full lg:w-auto shrink-0 min-w-0">
              <CalendarHeaderDate />
            </div>

            {/* Mobile Row 2 (Search + Add) / Desktop Right */}
            <div className={cn(
              "flex flex-wrap items-stretch sm:items-center justify-end gap-2 min-w-0 w-full lg:w-auto"
            )}>
              {headerActions ?? <CalendarHeaderAdd className="w-full sm:w-auto shrink-0" />}
            </div>
          </div>
          <CalendarHeaderMode />
        </CalendarHeader>
        <CalendarBody />
        <CalendarZoomControls />
      </div>
    </BookingCalendarProvider>
  );
}

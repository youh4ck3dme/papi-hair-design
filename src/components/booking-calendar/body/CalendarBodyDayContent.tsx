import { addMinutes, startOfDay } from "date-fns";
import { isSameDay } from "date-fns";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useBookingCalendarContext } from "../calendar-context";
import { BookingCalendarEvent } from "../BookingCalendarEvent";
import { CalendarBodyHeader } from "./CalendarBodyHeader";
import { HOURS } from "../calendar-types";

interface CalendarBodyDayContentProps {
  date: Date;
  resourceId?: string;
  resourceName?: string;
  showHeader?: boolean;
}

export function CalendarBodyDayContent({
  date,
  resourceId,
  resourceName,
  showHeader = true,
}: CalendarBodyDayContentProps) {
  const { filteredEvents, onSelectSlot, selectable, businessHours, pixelsPerHour } = useBookingCalendarContext();
  const dayEvents = useMemo(
    () =>
      filteredEvents.filter((e) => {
        const sameDay = isSameDay(e.start, date);
        if (!resourceId) return sameDay;
        return sameDay && (e.resource as any)?.employee_id === resourceId;
      }),
    [date, filteredEvents, resourceId],
  );

  const dayName = useMemo(
    () => new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date).toLowerCase(),
    [date],
  );
  const dateStr = useMemo(() => date.toLocaleDateString("en-CA"), [date]);
  const dayOverride = useMemo(
    () => businessHours?.overrides?.find((o: any) => o.override_date === dateStr),
    [businessHours?.overrides, dateStr],
  );
  const regularDayHours = useMemo(
    () => businessHours?.hours?.filter((h: any) => h.day_of_week === dayName) ?? [],
    [businessHours?.hours, dayName],
  );

  const isClosed = (hour: number) => {
    if (!businessHours || !businessHours.hours) return false;

    // Check overrides
    if (dayOverride) {
      if (dayOverride.mode === "closed" || dayOverride.mode === "on_request") return true;
      if (dayOverride.start_time && dayOverride.end_time) {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        return timeStr < dayOverride.start_time || timeStr >= dayOverride.end_time;
      }
    }

    // Check regular hours
    if (!regularDayHours.length) return true; // No hours defined means closed

    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    const isOpen = regularDayHours.some((h: any) => {
      if (h.mode !== "open") return false;
      return timeStr >= h.start_time && timeStr < h.end_time;
    });

    return !isOpen;
  };

  const getSlotRange = (hour: number) => {

    const start = addMinutes(
      startOfDay(date),
      Math.floor((hour * 60) / 30) * 30
    );
    return { start, end: addMinutes(start, 30) };
  };

  const handleSlotClick = (hour: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectable || !onSelectSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Keep the chosen time stable even near borders/overlays.
    // We only snap inside the clicked hour to :00 or :30.
    const minutesIntoHour = Math.max(0, Math.min(59.999, (y / rect.height) * 60));
    const snappedMinutes = minutesIntoHour >= 30 ? 30 : 0;
    const totalMinutes = hour * 60 + snappedMinutes;

    const start = addMinutes(
      startOfDay(date),
      Math.floor(totalMinutes / 30) * 30
    );
    const end = addMinutes(start, 30);
    onSelectSlot({ start, end });
  };

  const handleSlotKeyDown = (
    hour: number,
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!selectable || !onSelectSlot) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const { start, end } = getSlotRange(hour);
    onSelectSlot({ start, end });
  };

  return (
    <div className="flex flex-col flex-grow min-w-0">
      {showHeader && <CalendarBodyHeader date={date} resourceName={resourceName} />}

      <div className="flex-1 relative min-h-0">
        {HOURS.map((hour) => {
          const closed = isClosed(hour);
          return (
            <div
              key={hour}
              className={cn(
                "relative border-b border-border/50 group transition-colors",
                selectable && "cursor-pointer booking-calendar-slot",
                closed && "bg-muted/30 opacity-60"
              )}
              style={{ height: pixelsPerHour }}
              onClick={(e) =>
                selectable && onSelectSlot && handleSlotClick(hour, e)
              }
              onKeyDown={(e) => handleSlotKeyDown(hour, e)}
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
              aria-label={
                selectable ? `Vybrať čas okolo ${hour}:00${closed ? ' (Zatvorené)' : ''}` : undefined
              }
            >
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/40" />
            </div>
          );
        })}


        {dayEvents.map((event) => (
          <BookingCalendarEvent key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

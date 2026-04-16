import { addMinutes, startOfDay } from "date-fns";
import { isSameDay } from "date-fns";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useBookingCalendarContext } from "../calendar-context";
import { BookingCalendarEvent } from "../BookingCalendarEvent";
import { CalendarBodyHeader } from "./CalendarBodyHeader";
import { HOURS } from "../calendar-types";

const SLOT_LONG_PRESS_MS = 450;
const SLOT_TOUCH_MOVE_TOLERANCE = 12;

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
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
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

  useEffect(() => () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const buildSlotSelection = (
    hour: number,
    clientY: number,
    target: HTMLDivElement,
    intent: "book" | "block",
  ) => {
    const rect = target.getBoundingClientRect();
    const y = clientY - rect.top;

    const minutesIntoHour = Math.max(0, Math.min(59.999, (y / rect.height) * 60));
    const snappedMinutes = minutesIntoHour >= 30 ? 30 : 0;
    const totalMinutes = hour * 60 + snappedMinutes;

    const start = addMinutes(
      startOfDay(date),
      Math.floor(totalMinutes / 30) * 30
    );
    const end = addMinutes(start, 30);

    return {
      start,
      end,
      resourceId,
      resourceName,
      intent,
    };
  };

  const handleSlotClick = (hour: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectable || !onSelectSlot) return;
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    onSelectSlot(buildSlotSelection(hour, e.clientY, e.currentTarget, "book"));
  };

  const handleSlotKeyDown = (
    hour: number,
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!selectable || !onSelectSlot) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const { start, end } = getSlotRange(hour);
    onSelectSlot({ start, end, resourceId, resourceName, intent: "book" });
  };

  const handleTouchStart = (hour: number, e: React.TouchEvent<HTMLDivElement>) => {
    if (!selectable || !onSelectSlot || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    const target = e.currentTarget;
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onSelectSlot(buildSlotSelection(hour, touch.clientY, target, "block"));
      longPressTimeoutRef.current = null;
    }, SLOT_LONG_PRESS_MS);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaX > SLOT_TOUCH_MOVE_TOLERANCE || deltaY > SLOT_TOUCH_MOVE_TOLERANCE) {
      clearLongPressTimer();
    }
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
  };

  const handleTouchCancel = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
    longPressTriggeredRef.current = false;
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
              onTouchStart={(e) => handleTouchStart(hour, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
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

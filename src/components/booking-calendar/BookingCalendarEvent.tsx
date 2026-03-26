import { format, isSameDay, isSameMonth } from "date-fns";
import { sk } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BookingCalendarEvent as EventType } from "./calendar-types";
import { useBookingCalendarContext } from "./calendar-context";
import { CALENDAR_END_HOUR, CALENDAR_START_HOUR } from "./calendar-types";
import { getEventColorClasses } from "./event-color-classes";

interface EventPosition {
  left: string;
  width: string;
  top: string;
  height: string;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  borderLeftWidth?: string;
}

function getOverlappingEvents(
  current: EventType,
  events: EventType[]
): EventType[] {
  return events.filter((e) => {
    if (e.id === current.id) return false;
    return (
      current.start < e.end &&
      current.end > e.start &&
      isSameDay(current.start, e.start)
    );
  });
}

function calculateEventPosition(
  event: EventType,
  allEvents: EventType[],
  pixelsPerHour: number
): EventPosition | null {
  const overlapping = getOverlappingEvents(event, allEvents);
  const group = [event, ...overlapping].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  const position = group.indexOf(event);
  const total = overlapping.length + 1;
  const width = `${100 / total}%`;
  const left = `${(position * 100) / total}%`;

  const visibleStartMinutes = CALENDAR_START_HOUR * 60;
  const visibleEndMinutes = CALENDAR_END_HOUR * 60;

  const eventStartMinutes = event.start.getHours() * 60 + event.start.getMinutes();
  let eventEndMinutes = event.end.getHours() * 60 + event.end.getMinutes();

  if (!isSameDay(event.start, event.end)) {
    eventEndMinutes = 24 * 60;
  }

  const startMinutes = Math.max(eventStartMinutes, visibleStartMinutes);
  const endMinutes = Math.min(eventEndMinutes, visibleEndMinutes);

  // Event is outside visible range (06:00-20:00).
  if (endMinutes <= startMinutes) {
    return null;
  }

  const topPx = ((startMinutes - visibleStartMinutes) / 60) * pixelsPerHour;
  const durationMin = endMinutes - startMinutes;
  const heightPx = (durationMin / 60) * pixelsPerHour;
  return {
    left,
    width,
    top: `${topPx}px`,
    height: `${heightPx}px`,
  };
}

export interface BookingCalendarEventProps {
  event: EventType;
  month?: boolean;
  className?: string;
}

export function BookingCalendarEvent({
  event,
  month = false,
  className,
}: BookingCalendarEventProps) {
  const { filteredEvents, date, onSelectEvent, pixelsPerHour } = useBookingCalendarContext();
  let style = month ? undefined : calculateEventPosition(event, filteredEvents, pixelsPerHour);
  if (!month && !style) return null;

  if (event.color.startsWith("#") && style) {
    style = {
      ...style,
      backgroundColor: `${event.color}15`, // 5-10% opacity alternative for custom colors to match new theme
      borderColor: event.color,
      color: event.color,
      // borderLeftWidth: '4px' -> We use the tailwind classes instead where possible, but inline needs this:
      borderLeftWidth: '4px'
    };
  }

  const isInCurrentMonth = isSameMonth(event.start, date);
  const animationKey = `${event.id}-${isInCurrentMonth ? "current" : "adjacent"}`;
  const colorClasses = getEventColorClasses(event.color);


  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectEvent?.(event);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    onSelectEvent?.(event);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        role="button"
        tabIndex={0}
        className={cn(
          "px-2.5 py-1.5 rounded-md overflow-hidden cursor-pointer transition-all duration-300 border booking-calendar-event flex flex-col hover:shadow-md",
          colorClasses,
          !month && "absolute shadow-sm",
          className
        )}
        style={style}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        initial={month ? { opacity: 0 } : { opacity: 0, y: -3, scale: 0.98 }}
        animate={month ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={
          month
            ? { opacity: 0, transition: { duration: 0.12, ease: "linear" } }
            : {
                opacity: 0,
                scale: 0.98,
                transition: { duration: 0.15, ease: "easeOut" },
              }
        }
        transition={{
          duration: 0.2,
          ease: [0.25, 0.1, 0.25, 1],
          opacity: { duration: 0.2, ease: "linear" },
          layout: { duration: 0.2, ease: "easeOut" },
        }}
        layoutId={month ? undefined : `event-${animationKey}-day`}
      >
        <motion.div
          className={cn(
            "flex w-full min-w-0 flex-grow",
            month ? "flex-row items-center justify-between flex-none" : "flex-col"
          )}
          layout={month ? false : "position"}
        >
          <p className={cn(
            "truncate w-full font-semibold",
            month ? "text-sm leading-tight" : "text-sm leading-tight tracking-tight"
          )}>
            {event.title}
          </p>
          <p className={cn(
            "truncate w-full",
            month ? "text-xs font-medium opacity-100" : "text-xs font-medium mt-0.5 opacity-80"
          )}>
            <span>{format(event.start, "HH:mm", { locale: sk })}</span>
            <span className={cn("mx-1 opacity-60", month && "hidden")}>–</span>
            <span className={cn(month && "hidden")}>
              {format(event.end, "HH:mm", { locale: sk })}
            </span>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

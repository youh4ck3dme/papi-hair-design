import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isWithinInterval,
} from "date-fns";
import { useMemo } from "react";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useBookingCalendarContext } from "../calendar-context";
import { BookingCalendarEvent } from "../BookingCalendarEvent";

const WEEKDAY_LABELS = ["po", "ut", "st", "št", "pi", "so", "ne"];

export function CalendarBodyMonth() {
  const { date, filteredEvents, setDate, setMode, monthDensity } = useBookingCalendarContext();
  const monthStart = useMemo(() => startOfMonth(date), [date]);
  const monthEnd = useMemo(() => endOfMonth(date), [date]);
  const calendarStart = useMemo(
    () => startOfWeek(monthStart, { weekStartsOn: 1 }),
    [monthStart],
  );
  const calendarEnd = useMemo(
    () => endOfWeek(monthEnd, { weekStartsOn: 1 }),
    [monthEnd],
  );

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
      }),
    [calendarEnd, calendarStart],
  );

  const today = new Date();

  const dayEventMap = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const event of filteredEvents) {
      const isVisible =
        isWithinInterval(event.start, {
          start: calendarStart,
          end: calendarEnd,
        }) ||
        isWithinInterval(event.end, { start: calendarStart, end: calendarEnd });
      if (!isVisible) continue;

      const dayKey = format(event.start, "yyyy-MM-dd");
      const eventsForDay = map.get(dayKey);
      if (eventsForDay) {
        eventsForDay.push(event);
      } else {
        map.set(dayKey, [event]);
      }
    }
    return map;
  }, [calendarEnd, calendarStart, filteredEvents]);

  const maxVisibleEvents = monthDensity === "compact" ? 2 : 4;
  const dayCellClass =
    monthDensity === "compact"
      ? "min-h-[84px] sm:min-h-[92px] p-1.5"
      : "min-h-[102px] sm:min-h-[120px] p-2";

  return (
    <div className="flex flex-col flex-grow overflow-hidden min-h-0">
      <div className="grid grid-cols-7 border-border divide-x divide-border">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="border-b border-border/80 bg-background py-1.5 text-center text-[11px] font-medium tracking-[0.02em] text-muted-foreground md:py-2 md:text-xs"
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={monthStart.toISOString()}
          className="relative grid min-h-0 flex-grow grid-cols-7 overflow-y-auto auto-rows-fr"
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.95 }}
          transition={{ duration: 0.16, ease: "easeInOut" }}
        >
          {calendarDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEvents = dayEventMap.get(dayKey) ?? [];
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, date);

            return (
              <button
                type="button"
                key={day.toISOString()}
                className={cn(
                  "relative flex w-full flex-col border-b border-r border-border/70 text-left transition-colors cursor-pointer",
                  dayCellClass,
                  !isCurrentMonth && "bg-background/70 text-muted-foreground/65",
                  isCurrentMonth && "bg-background hover:bg-background/95"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setDate(day);
                  setMode("day");
                }}
              >
                <div
                  className={cn(
                    "w-fit text-xs font-semibold md:text-sm",
                    isToday
                      ? "booking-calendar-today inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 py-0"
                      : "px-0.5 py-0 text-foreground/85"
                  )}
                >
                  {format(day, "d", { locale: sk })}
                </div>
                <AnimatePresence mode="wait">
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {dayEvents.slice(0, maxVisibleEvents).map((event) => (
                      <BookingCalendarEvent
                        key={event.id}
                        event={event}
                        className="relative h-auto"
                        month
                      />
                    ))}
                    {dayEvents.length > maxVisibleEvents && (
                      <motion.div
                        key={`more-${day.toISOString()}`}
                        role="button"
                        tabIndex={0}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="booking-calendar-more -mx-1 rounded px-1 text-xs font-semibold hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDate(day);
                          setMode("day");
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          setDate(day);
                          setMode("day");
                        }}
                        aria-label={`Prejsť na deň ${format(day, "d. M.", { locale: sk })} (${dayEvents.length - maxVisibleEvents} ďalších)`}
                      >
                        +{dayEvents.length - maxVisibleEvents} ďalších
                      </motion.div>
                    )}
                  </div>
                </AnimatePresence>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

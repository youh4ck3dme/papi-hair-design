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

const WEEKDAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

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
      : "min-h-[104px] sm:min-h-[122px] p-2";

  return (
    <div className="flex flex-col flex-grow overflow-hidden min-h-0">
      <div className="grid grid-cols-7 border-border divide-x divide-border">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="border-b border-border py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground md:text-sm md:tracking-normal"
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
                  "relative flex w-full flex-col border-b border-r border-border text-left transition-colors cursor-pointer",
                  dayCellClass,
                  !isCurrentMonth && "bg-muted/35 text-muted-foreground/60",
                  isCurrentMonth && "hover:bg-muted/25"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setDate(day);
                  setMode("day");
                }}
              >
                <div
                  className={cn(
                    "w-fit rounded-full px-2 py-1 text-sm font-semibold md:text-base",
                    isToday && "booking-calendar-today"
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

import { format, isSameDay } from "date-fns";
import type { CalendarEvent, Employee, TimeSegment } from "./types";
import CalendarEventCard from "./CalendarEventCard";
import NonWorkingOverlay from "./NonWorkingOverlay";
import { getMinutesInTZ } from "@/lib/timezone";
import { canBookSlot, isSlotBlockedByEvents } from "./slotGuards";

interface EmployeeColumnProps {
  employee: Employee;
  events: CalendarEvent[];
  segments: TimeSegment[];
  date: Date;
  startHour: number;
  endHour: number;
  hourHeight: number;
  timezone: string;
  fitToScreen?: boolean;
  onSlotClick: (employeeId: string, time: Date, isWorking: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function EmployeeColumn({
  employee,
  events,
  segments,
  date,
  startHour,
  endHour,
  hourHeight,
  timezone,
  fitToScreen = false,
  onSlotClick,
  onEventClick,
}: EmployeeColumnProps) {
  const SLOT_INTERVAL_MINUTES = 30;
  const slotCount = ((endHour - startHour) * 60) / SLOT_INTERVAL_MINUTES;
  const slots = Array.from({ length: slotCount }, (_, index) => startHour * 60 + index * SLOT_INTERVAL_MINUTES);
  const slotHeight = (hourHeight * SLOT_INTERVAL_MINUTES) / 60;
  const nowMinutes = getMinutesInTZ(new Date(), timezone);
  const showNowLine = isSameDay(date, new Date()) && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;
  const nowTop = ((nowMinutes - startHour * 60) / 60) * hourHeight;

  return (
    <div className={fitToScreen ? "min-w-0 flex-1 border-l border-border/40" : "min-w-[170px] border-l border-border/40"}>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-2 py-2.5 backdrop-blur">
        <p className="truncate text-sm font-semibold" style={{ color: employee.color }}>
          {employee.name}
        </p>
      </div>

      <div className="relative" style={{ height: (endHour - startHour) * hourHeight }}>
        <NonWorkingOverlay hourHeight={hourHeight} startHour={startHour} segments={segments} />

        {showNowLine && (
          <div className="pointer-events-none absolute left-0 right-0 z-10" style={{ top: nowTop }}>
            <div className="h-px bg-primary/80 shadow-[0_0_8px_rgba(245,158,11,0.55)]" />
          </div>
        )}

        {slots.map((slotMinutes) => {
          const slotTime = new Date(date);
          slotTime.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
          const minute = getMinutesInTZ(slotTime, timezone);
          const slotWorking = segments.some((segment) => segment.kind === "working" && minute >= segment.startMinutes && minute < segment.endMinutes);
          const slotBlocked = isSlotBlockedByEvents(slotTime, events);
          const slotBookable = canBookSlot({ slotWorking, slotBlocked });
          const isHourStart = slotMinutes % 60 === 0;

          return (
            <button
              key={`${employee.id}-${format(slotTime, "HH:mm")}`}
              onClick={() => onSlotClick(employee.id, slotTime, slotBookable)}
              className={`absolute left-0 right-0 border-b touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 ${
                isHourStart ? "border-border/45" : "border-border/20"
              } ${slotBookable ? "cursor-pointer active:bg-primary/10 hover:bg-primary/5" : "cursor-not-allowed opacity-85"}`}
              style={{ top: ((slotMinutes - startHour * 60) / 60) * hourHeight, height: slotHeight }}
              title={slotBookable ? "Vytvoriť rezerváciu" : slotBlocked ? "Čas je blokovaný" : "Zamestnanec v tomto čase nepracuje"}
              aria-label={`${employee.name} ${format(slotTime, "HH:mm")}`}
              aria-disabled={!slotBookable}
            />
          );
        })}

        {events.map((event) => (
          <CalendarEventCard
            key={event.id}
            event={event}
            employee={employee}
            hourHeight={hourHeight}
            startHour={startHour}
            timezone={timezone}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

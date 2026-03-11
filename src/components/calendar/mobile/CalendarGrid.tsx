import type { CalendarEvent, DayException, Employee, WorkingSchedule } from "./types";
import EmployeeColumn from "./EmployeeColumn";
import { computeDaySegments, DAY_END_MINUTES, DAY_START_MINUTES } from "./schedule";

interface CalendarGridProps {
  date: Date;
  employees: Employee[];
  selectedEmployeeIds: string[];
  events: CalendarEvent[];
  schedules: WorkingSchedule[];
  dayExceptions: DayException[];
  timezone: string;
  onSlotClick: (employeeId: string, time: Date, isWorking: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const START_HOUR = DAY_START_MINUTES / 60;
const END_HOUR = DAY_END_MINUTES / 60;
const HOUR_HEIGHT = 58;

export default function CalendarGrid({
  date,
  employees,
  selectedEmployeeIds,
  events,
  schedules,
  dayExceptions,
  timezone,
  onSlotClick,
  onEventClick,
}: CalendarGridProps) {
  const selectedEmployees = employees.filter((employee) => selectedEmployeeIds.includes(employee.id));
  const fitToScreen = selectedEmployees.length > 0 && selectedEmployees.length <= 3;
  const useTwoColumnRows = selectedEmployees.length > 3;

  const splitRows = (items: Employee[], size: number): Employee[][] => {
    const rows: Employee[][] = [];
    for (let index = 0; index < items.length; index += size) {
      rows.push(items.slice(index, index + size));
    }
    return rows;
  };

  const employeeRows = useTwoColumnRows ? splitRows(selectedEmployees, 2) : [selectedEmployees];

  const renderTimeAxis = (id: string) => (
    <div key={`time-axis-${id}`} className="sticky left-0 z-20 w-12 border-r border-border/40 bg-background shrink-0">
      <div className="h-[36px] border-b border-border/40" />
      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((hour) => (
        <div key={`${id}-${hour}`} className="border-b border-border/30 px-1 pt-1 text-[10px] text-muted-foreground" style={{ height: HOUR_HEIGHT }}>
          {String(hour).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );

  if (selectedEmployees.length === 0) {
    return (
      <div className="flex-1 min-h-0 border-t border-border/40 flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Vyberte aspoň jedného pracovníka.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto border-t border-border/40">
      <div className={useTwoColumnRows ? "flex min-w-0 flex-col gap-3" : fitToScreen ? "flex w-full min-w-0" : "flex min-w-max"}>
        {employeeRows.map((rowEmployees, rowIndex) => (
          <div key={`row-${rowIndex}`} className={fitToScreen || useTwoColumnRows ? "flex w-full min-w-0" : "flex min-w-max"}>
            {renderTimeAxis(`row-${rowIndex}`)}
            {rowEmployees.map((employee) => {
              const segments = computeDaySegments(date, employee.id, schedules, dayExceptions);
              const employeeEvents = events.filter((event) => event.employeeId === employee.id);

              return (
                <EmployeeColumn
                  key={employee.id}
                  employee={employee}
                  events={employeeEvents}
                  segments={segments}
                  date={date}
                  startHour={START_HOUR}
                  endHour={END_HOUR}
                  hourHeight={HOUR_HEIGHT}
                  timezone={timezone}
                  fitToScreen={fitToScreen || useTwoColumnRows}
                  onSlotClick={onSlotClick}
                  onEventClick={onEventClick}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

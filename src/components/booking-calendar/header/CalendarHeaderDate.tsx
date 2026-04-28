import { useEffect, useState } from "react";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { sk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBookingCalendarContext } from "../calendar-context";
import { cn } from "@/lib/utils";

function formatCalendarHeaderLabel(date: Date, mode: "day" | "week" | "month"): string {
  if (mode === "month") {
    return format(date, "LLLL yyyy", { locale: sk });
  }

  if (mode === "week") {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
      return `${format(weekStart, "d. MMMM yyyy", { locale: sk })} - ${format(weekEnd, "d. MMMM yyyy", { locale: sk })}`;
    }

    if (weekStart.getMonth() !== weekEnd.getMonth()) {
      return `${format(weekStart, "d. MMMM", { locale: sk })} - ${format(weekEnd, "d. MMMM yyyy", { locale: sk })}`;
    }

    return `${format(weekStart, "d.", { locale: sk })} - ${format(weekEnd, "d. MMMM yyyy", { locale: sk })}`;
  }

  return format(date, "d. MMMM yyyy", { locale: sk });
}

export function CalendarHeaderDate() {
  const { mode, date, setDate, setMode } = useBookingCalendarContext();
  const isMonthMode = mode === "month";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => startOfMonth(date));
  const previousLabel =
    mode === "month" ? "Predchádzajúci mesiac" : mode === "week" ? "Predchádzajúci týždeň" : "Predchádzajúci deň";
  const nextLabel =
    mode === "month" ? "Ďalší mesiac" : mode === "week" ? "Ďalší týždeň" : "Ďalší deň";

  useEffect(() => {
    if (!pickerOpen) return;
    setPickerMonth(startOfMonth(date));
  }, [date, pickerOpen]);

  const handleBack = () => {
    if (mode === "month") setDate(subMonths(date, 1));
    else if (mode === "week") setDate(subWeeks(date, 1));
    else setDate(subDays(date, 1));
  };

  const handleForward = () => {
    if (mode === "month") setDate(addMonths(date, 1));
    else if (mode === "week") setDate(addWeeks(date, 1));
    else setDate(addDays(date, 1));
  };

  const handleSelectDay = (nextDate: Date | undefined) => {
    if (!nextDate) return;
    setDate(nextDate);
    setMode("day");
    setPickerMonth(startOfMonth(nextDate));
    setPickerOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 min-w-0">
        <Button
          variant="outline"
          size="icon"
          aria-label={previousLabel}
          className="h-7 w-7 md:h-6 md:w-6 shrink-0 hover:bg-gold/10 hover:border-gold/50 hover:text-gold"
          onClick={handleBack}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label="Vybrať dátum v kalendári"
          className={cn(
            "h-auto min-w-0 flex-1 px-2 py-1 text-sm font-semibold text-foreground hover:bg-gold/10 hover:text-foreground",
            isMonthMode ? "justify-start text-base md:text-sm" : "justify-center",
          )}
        >
          <span
            className={cn(
              "flex-1 truncate text-sm font-semibold text-foreground",
              isMonthMode ? "text-left text-base md:text-sm" : "text-center",
            )}
          >
            {formatCalendarHeaderLabel(date, mode)}
          </span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={nextLabel}
          className="h-7 w-7 md:h-6 md:w-6 shrink-0 hover:bg-gold/10 hover:border-gold/50 hover:text-gold"
          onClick={handleForward}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-[22rem] gap-0 overflow-hidden rounded-[28px] border-border/70 p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-gold/20 bg-gold/15 px-5 py-4 text-left">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
              {format(date, "d. MMMM yyyy", { locale: sk })}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Rýchly výber dňa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPickerMonth((current) => subMonths(current, 1))}
                aria-label="Predchádzajúci mesiac"
                className="h-9 w-9 rounded-xl hover:bg-background"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-sm font-bold capitalize text-foreground">
                {format(pickerMonth, "LLLL yyyy", { locale: sk })}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPickerMonth((current) => addMonths(current, 1))}
                aria-label="Ďalší mesiac"
                className="h-9 w-9 rounded-xl hover:bg-background"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Calendar
              locale={sk}
              mode="single"
              month={pickerMonth}
              selected={date}
              onSelect={handleSelectDay}
              onMonthChange={setPickerMonth}
              weekStartsOn={1}
              className="mx-auto w-full rounded-2xl border border-border/60 bg-background p-3"
              classNames={{
                caption: "hidden",
                nav: "hidden",
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7 gap-y-1",
                head_cell: "w-full text-center text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground",
                row: "grid grid-cols-7 gap-y-1",
                cell: "flex h-11 w-full items-center justify-center p-0 text-center text-sm",
                day: "h-11 w-11 rounded-2xl p-0 font-semibold hover:bg-gold/10",
                day_today: "border border-gold/40 bg-gold/10 text-foreground",
                day_selected:
                  "bg-gold text-gold-foreground hover:bg-gold/90 focus:bg-gold focus:text-gold-foreground",
                day_outside:
                  "text-muted-foreground/50 opacity-100 aria-selected:bg-muted aria-selected:text-muted-foreground/70",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

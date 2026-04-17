import { useEffect, useState } from "react";
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfMonth } from "date-fns";
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
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={previousLabel}
          className="h-9 w-9 shrink-0 rounded-xl border-border/70 bg-background/70 shadow-sm hover:border-gold/50 hover:bg-gold/10 hover:text-gold md:h-8 md:w-8"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4 md:h-3.5 md:w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label="Vybrať dátum v kalendári"
          className={cn(
            "h-auto min-h-[40px] min-w-0 flex-1 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-foreground hover:border-gold/20 hover:bg-gold/10 hover:text-foreground md:min-h-[36px]",
            isMonthMode ? "justify-start text-base md:text-sm" : "justify-center",
          )}
        >
          <span
            className={cn(
              "flex-1 truncate text-sm font-semibold text-foreground",
              isMonthMode ? "text-left text-base md:text-sm" : "text-center",
            )}
          >
            {format(date, isMonthMode ? "LLLL yyyy" : "d. MMMM yyyy", { locale: sk })}
          </span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={nextLabel}
          className="h-9 w-9 shrink-0 rounded-xl border-border/70 bg-background/70 shadow-sm hover:border-gold/50 hover:bg-gold/10 hover:text-gold md:h-8 md:w-8"
          onClick={handleForward}
        >
          <ChevronRight className="h-4 w-4 md:h-3.5 md:w-3.5" />
        </Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-[22rem] gap-0 overflow-hidden rounded-[30px] border-border/70 bg-background/95 p-0 shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:max-w-md">
          <DialogHeader className="border-b border-gold/20 bg-[linear-gradient(180deg,rgba(201,168,76,0.18),rgba(201,168,76,0.06))] px-5 py-4 text-left">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
              {format(date, "d. MMMM yyyy", { locale: sk })}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Rýchly výber dňa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-muted/35 px-3 py-2 shadow-sm">
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
              className="mx-auto w-full rounded-[24px] border border-border/60 bg-background p-3 shadow-sm"
              classNames={{
                caption: "hidden",
                nav: "hidden",
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7 gap-y-1",
                head_cell: "w-full text-center text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground",
                row: "grid grid-cols-7 gap-y-1",
                cell: "flex h-11 w-full items-center justify-center p-0 text-center text-sm sm:h-12",
                day: "h-11 w-11 rounded-2xl p-0 font-semibold hover:bg-gold/10 sm:h-12 sm:w-12",
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

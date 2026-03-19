import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, isBefore, isAfter, addDays, isSameDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { StepHeader } from "./BookingUI";

interface DateTimeSelectionProps {
    calendarMonth: Date;
    setCalendarMonth: (date: Date) => void;
    dateLocale: any;
    firstDayOffset: number;
    daysInMonth: number;
    today: Date;
    maxDays: number;
    selectedDate: number | null;
    setSelectedDate: (day: number | null) => void;
    selectedFullDate: Date | null;
    setSelectedTime: (time: string | null) => void;
    isBusinessOpenOnDay: (date: Date) => boolean;
    loadingSlots: boolean;
    availabilityStatus: "idle" | "loading" | "success" | "no-slots" | "error";
    availableSlots: Date[];
    selectedTime: string | null;
    timeGroups: { dopoludnia: string[]; popoludni: string[] };
}

export function DateTimeSelection({
    calendarMonth,
    setCalendarMonth,
    dateLocale,
    firstDayOffset,
    daysInMonth,
    today,
    maxDays,
    selectedDate,
    setSelectedDate,
    selectedFullDate,
    setSelectedTime,
    isBusinessOpenOnDay,
    loadingSlots,
    availabilityStatus,
    availableSlots,
    selectedTime,
    timeGroups,
}: DateTimeSelectionProps) {
    const { t } = useTranslation();

    const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
    const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

    return (
        <div className="animate-fade-in px-4">
            <StepHeader num="3" title={t("booking.step3")} />
            <div className="mb-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent p-4 sm:p-5">
                <p className="text-base font-semibold text-foreground">{t("booking.assignmentTitle")}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("booking.assignmentSubtitle")}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-border/40">
                    <button
                        onClick={prevMonth}
                        className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border/60 transition-all hover:border-primary/40 hover:bg-accent active:scale-90"
                        aria-label="Predchádzajúci mesiac"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <h3 className="font-bold text-base capitalize text-foreground tracking-wide">
                        {format(calendarMonth, "LLLL yyyy", { locale: dateLocale })}
                    </h3>
                    <button
                        onClick={nextMonth}
                        className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/80 active:scale-90 dark:text-background"
                        aria-label="Ďalší mesiac"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="p-3">
                    <div className="grid grid-cols-7 mb-1">
                        {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                            <div key={d} className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1">
                        {Array.from({ length: firstDayOffset }, (_, i) => (
                            <div key={`empty-${calendarMonth.getTime()}-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                            const isPast = isBefore(dayDate, today);
                            const isTooFar = isAfter(dayDate, addDays(today, maxDays));
                            const isClosed = !isBusinessOpenOnDay(dayDate);
                            const disabled = isPast || isTooFar || isClosed;
                            const isSelected = selectedDate === day && isSameDay(dayDate, selectedFullDate ?? new Date(0));
                            const isToday = isSameDay(dayDate, today);

                            let cls = "";
                            if (isSelected) cls = "bg-primary text-primary-foreground dark:text-background font-bold shadow-md shadow-primary/30 ring-2 ring-primary ring-offset-2 ring-offset-background scale-105";
                            else if (disabled) cls = "text-muted-foreground/30 bg-muted/20 cursor-not-allowed";
                            else if (isToday) cls = "border-2 border-primary/50 text-primary font-semibold hover:bg-primary/10";
                            else cls = "text-foreground hover:bg-accent hover:text-accent-foreground border border-transparent";

                            return (
                                <div key={day} className="flex justify-center p-0.5">
                                    <button
                                        data-testid={disabled ? undefined : `date-btn-${day}`}
                                        onClick={() => { if (!disabled) { setSelectedDate(day); setSelectedTime(null); } }}
                                        disabled={disabled}
                                        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm transition-all duration-200 ${cls}`}
                                    >
                                        {day}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="min-h-[200px] mt-6">
                {Boolean(selectedDate) && (
                    <div className="animate-fade-in">
                        <StepHeader num="4" title={t("booking.step4")} />
                        {loadingSlots ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : availabilityStatus === "error" ? (
                            <div className="text-center py-8 text-muted-foreground/70 text-sm border border-dashed border-border rounded-2xl">
                                {t("booking.availabilityLoadError", { defaultValue: "Nepodarilo sa načítať dostupnosť. Skúste to prosím znova." })}
                            </div>
                        ) : availabilityStatus === "no-slots" || availableSlots.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground/70 text-sm border border-dashed border-border rounded-2xl">
                                {t("booking.noSlots")}
                            </div>
                        ) : (
                            <>
                                {timeGroups.dopoludnia.length > 0 && (
                                    <div className="mb-8">
                                        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 border-b border-border/40 pb-2">{t("booking.timeAm")}</p>
                                        <div className="flex flex-wrap gap-2.5">
                                            {timeGroups.dopoludnia.map((tVal) => (
                                                <button
                                                    key={tVal}
                                                    data-testid="time-slot"
                                                    onClick={() => setSelectedTime(tVal)}
                                                    className={`min-h-[44px] min-w-[80px] rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200 flex-1 sm:flex-none justify-center items-center flex ${selectedTime === tVal
                                                        ? "bg-primary text-primary-foreground dark:text-background border-primary shadow-md shadow-primary/25 ring-1 ring-primary ring-offset-1 ring-offset-background"
                                                        : "bg-card text-foreground border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5 active:scale-95 shadow-sm"
                                                        }`}
                                                >
                                                    {tVal}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {timeGroups.popoludni.length > 0 && (
                                    <div className="mb-6">
                                        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 border-b border-border/40 pb-2">{t("booking.timePm")}</p>
                                        <div className="flex flex-wrap gap-2.5">
                                            {timeGroups.popoludni.map((tVal) => (
                                                <button
                                                    key={tVal}
                                                    data-testid="time-slot"
                                                    onClick={() => setSelectedTime(tVal)}
                                                    className={`min-h-[44px] min-w-[80px] rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200 flex-1 sm:flex-none justify-center items-center flex ${selectedTime === tVal
                                                        ? "bg-primary text-primary-foreground dark:text-background border-primary shadow-md shadow-primary/25 ring-1 ring-primary ring-offset-1 ring-offset-background"
                                                        : "bg-card text-foreground border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5 active:scale-95 shadow-sm"
                                                        }`}
                                                >
                                                    {tVal}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

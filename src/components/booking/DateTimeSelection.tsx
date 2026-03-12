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
            <div className="mb-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent p-4">
                <p className="text-sm font-semibold text-foreground">{t("booking.assignmentTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("booking.assignmentSubtitle")}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                {/* Month nav bar */}
                <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-border/40">
                    <button
                        onClick={prevMonth}
                        className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-accent hover:border-primary/40 transition-all active:scale-90"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <h3 className="font-bold text-base capitalize text-foreground tracking-wide">
                        {format(calendarMonth, "LLLL yyyy", { locale: dateLocale })}
                    </h3>
                    <button
                        onClick={nextMonth}
                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground dark:text-background flex items-center justify-center hover:bg-primary/80 transition-all active:scale-90"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="p-3">
                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 mb-1">
                        {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                            <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-center text-muted-foreground/70 py-1">{d}</div>
                        ))}
                    </div>

                    {/* Calendar grid */}
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
                            if (isSelected) cls = "bg-primary text-primary-foreground dark:text-background font-bold shadow-md ring-2 ring-primary/30";
                            else if (isToday) cls = "ring-1 ring-primary/60 text-primary font-semibold";
                            else if (disabled) cls = "text-muted-foreground/20 cursor-not-allowed";
                            else cls = "text-foreground hover:bg-accent hover:text-foreground";

                            return (
                                <div key={day} className="flex justify-center">
                                    <button
                                        data-testid={disabled ? undefined : `date-btn-${day}`}
                                        onClick={() => { if (!disabled) { setSelectedDate(day); setSelectedTime(null); } }}
                                        disabled={disabled}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-150 ${cls}`}
                                    >
                                        {day}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Time slots */}
            {Boolean(selectedDate) && (
                <div className="animate-fade-in mt-6">
                    <StepHeader num="4" title={t("booking.step4")} />
                    {loadingSlots ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/70 text-sm border border-dashed border-border rounded-2xl">
                            {t("booking.noSlots")}
                        </div>
                    ) : (
                        <>
                            {timeGroups.dopoludnia.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 mb-3">{t("booking.timeAm")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {timeGroups.dopoludnia.map((tVal) => (
                                            <button
                                                key={tVal}
                                                data-testid="time-slot"
                                                onClick={() => setSelectedTime(tVal)}
                                                className={`text-sm px-4 py-2 rounded-full transition-all duration-150 font-semibold border ${selectedTime === tVal
                                                    ? "bg-primary text-primary-foreground dark:text-background border-primary shadow-md shadow-primary/20"
                                                    : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                                                    }`}
                                            >
                                                {tVal}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {timeGroups.popoludni.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 mb-3">{t("booking.timePm")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {timeGroups.popoludni.map((tVal) => (
                                            <button
                                                key={tVal}
                                                data-testid="time-slot"
                                                onClick={() => setSelectedTime(tVal)}
                                                className={`text-sm px-4 py-2 rounded-full transition-all duration-150 font-semibold border ${selectedTime === tVal
                                                    ? "bg-primary text-primary-foreground dark:text-background border-primary shadow-md shadow-primary/20"
                                                    : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:text-primary hover:bg-primary/5"
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
    );
}

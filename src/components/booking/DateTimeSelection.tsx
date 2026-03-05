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
    selectedWorkerId: string | null;
    selectedDate: number | null;
    setSelectedDate: (day: number | null) => void;
    selectedFullDate: Date | null;
    setSelectedTime: (time: string | null) => void;
    isBusinessOpenOnDay: (date: Date) => boolean;
    isEmployeeAvailableOnDay: (empId: string, date: Date) => boolean;
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
    selectedWorkerId,
    selectedDate,
    setSelectedDate,
    selectedFullDate,
    setSelectedTime,
    isBusinessOpenOnDay,
    isEmployeeAvailableOnDay,
    loadingSlots,
    availableSlots,
    selectedTime,
    timeGroups,
}: DateTimeSelectionProps) {
    const { t } = useTranslation();

    return (
        <div className="animate-fade-in">
            <StepHeader num="4" title={t("booking.step4")} />
            <div className="rounded-xl p-4 border border-border bg-card">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg ml-2 text-foreground">
                        {format(calendarMonth, "LLLL yyyy", { locale: dateLocale })}
                    </h3>
                    <div className="flex rounded-full overflow-hidden border border-border">
                        <button
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                            className="p-2 px-4 bg-card text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                            className="p-2 px-4 bg-primary text-primary-foreground dark:text-background hover:bg-primary/80 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-y-4 text-center mb-2">
                    {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                        <div key={d} className="font-medium text-sm text-muted-foreground">{d}</div>
                    ))}

                    {Array.from({ length: firstDayOffset }, (_, i) => <div key={`empty-${calendarMonth.getTime()}-${i}`} className="py-1" />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                        const isPast = isBefore(dayDate, today);
                        const isTooFar = isAfter(dayDate, addDays(today, maxDays));
                        const isClosed = !isBusinessOpenOnDay(dayDate);
                        const empAvailable = selectedWorkerId ? isEmployeeAvailableOnDay(selectedWorkerId, dayDate) : false;
                        const disabled = isPast || isTooFar || isClosed || !empAvailable;
                        const isSelected = selectedDate === day && isSameDay(dayDate, selectedFullDate ?? new Date(0));
                        const isToday = isSameDay(dayDate, today);
                        let dayBtnClass = "text-foreground hover:bg-accent";
                        if (isSelected) dayBtnClass = "bg-primary text-primary-foreground dark:text-background font-bold shadow-md";
                        else if (isToday) dayBtnClass = "border border-muted-foreground/40 text-foreground";
                        else if (isPast || isTooFar) dayBtnClass = "text-muted-foreground/20 cursor-not-allowed";
                        else if (isClosed) dayBtnClass = "bg-muted/40 text-muted-foreground/30 cursor-not-allowed";
                        else if (!empAvailable) dayBtnClass = "text-muted-foreground/20 cursor-not-allowed";

                        return (
                            <div key={day} className="flex justify-center">
                                <button
                                    data-testid={disabled ? undefined : `date-btn-${day}`}
                                    onClick={() => { if (!disabled) { setSelectedDate(day); setSelectedTime(null); } }}
                                    disabled={disabled}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${dayBtnClass}`}
                                >
                                    {day}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {Boolean(selectedDate) && (
                <div className="animate-fade-in mt-6">
                    <StepHeader num="5" title={t("booking.step5")} />
                    {(() => {
                        if (loadingSlots) {
                            return (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            );
                        }
                        if (availableSlots.length === 0) {
                            return <p className="text-center text-muted-foreground py-4">{t("booking.noSlots")}</p>;
                        }
                        return (
                            <>
                                {timeGroups.dopoludnia.length > 0 && (
                                    <div className="mb-8">
                                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">{t("booking.timeAm")}</h4>
                                        <div className="flex flex-wrap gap-x-4 gap-y-3">
                                            {timeGroups.dopoludnia.map((tVal) => {
                                                const isSelected = selectedTime === tVal;
                                                const timeBtnClass = isSelected
                                                    ? "bg-primary text-primary-foreground dark:text-background border-primary"
                                                    : "bg-card text-foreground border-border hover:border-primary/50";
                                                return (
                                                    <button
                                                        key={tVal}
                                                        data-testid="time-slot"
                                                        onClick={() => setSelectedTime(tVal)}
                                                        className={`text-base px-4 py-2 rounded-full transition-all font-medium border ${timeBtnClass}`}
                                                    >
                                                        {tVal}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {timeGroups.popoludni.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">{t("booking.timePm")}</h4>
                                        <div className="flex flex-wrap gap-x-4 gap-y-3">
                                            {timeGroups.popoludni.map((tVal) => {
                                                const isSelected = selectedTime === tVal;
                                                const timeBtnClass = isSelected
                                                    ? "bg-primary text-primary-foreground dark:text-background border-primary"
                                                    : "bg-card text-foreground border-border hover:border-primary/50";
                                                return (
                                                    <button
                                                        key={tVal}
                                                        data-testid="time-slot"
                                                        onClick={() => setSelectedTime(tVal)}
                                                        className={`text-base px-4 py-2 rounded-full transition-all font-medium border ${timeBtnClass}`}
                                                    >
                                                        {tVal}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

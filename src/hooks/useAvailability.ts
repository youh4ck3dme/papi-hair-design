import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { startOfDay, startOfMonth, getDaysInMonth, getDay, format, addDays } from "date-fns";
import { generateSlots, getEffectiveIntervals, type BusinessHours, type EmployeeSchedule, type ExistingAppointment, type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";
import { ServiceRow, EmployeeRow } from "@/components/booking/types";

export function useAvailability(
    business: any,
    businessHourEntries: BusinessHourEntry[],
    dateOverrides: DateOverrideEntry[],
    schedules: Record<string, EmployeeSchedule[]>,
    selectedService: ServiceRow | null,
    selectedEmployee: EmployeeRow | null
) {
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const monthStart = startOfMonth(calendarMonth);
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDayOffset = (getDay(monthStart) + 6) % 7; // Monday-first
    const today = startOfDay(new Date());
    const maxDays = business?.max_days_ahead ?? 60;

    const selectedFullDate = useMemo(() => {
        if (!selectedDate) return null;
        return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), selectedDate);
    }, [selectedDate, calendarMonth]);

    const isEmployeeAvailableOnDay = useCallback((empId: string, date: Date) => {
        const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
        return (schedules[empId] ?? []).some((s) => s.day_of_week === dayName);
    }, [schedules]);

    const isBusinessOpenOnDay = useCallback((date: Date) => {
        const intervals = getEffectiveIntervals(
            date,
            businessHourEntries,
            dateOverrides,
            business?.opening_hours as BusinessHours | undefined
        );
        return !!(intervals && intervals.length > 0);
    }, [businessHourEntries, dateOverrides, business]);

    useEffect(() => {
        if (!selectedFullDate || !selectedEmployee || !selectedService || !business) {
            setAvailableSlots([]);
            return;
        }
        const loadSlots = async () => {
            setLoadingSlots(true);
            const dayStart = startOfDay(selectedFullDate);
            const dayEnd = addDays(dayStart, 1);

            try {
                const apptsRef = collection(db, "appointments");
                const apptsQuery = query(
                    apptsRef,
                    where("employee_id", "==", selectedEmployee.id),
                    where("start_at", ">=", dayStart.toISOString()),
                    where("start_at", "<", dayEnd.toISOString()),
                    orderBy("start_at")
                );
                const apptsSnap = await getDocs(apptsQuery);

                const existing = apptsSnap.docs
                    .map((d) => {
                        const a = d.data();
                        return { start_at: a.start_at, end_at: a.end_at, status: a.status };
                    })
                    .filter((a: any) => a.status !== "cancelled")
                    .map((a: any) => ({ start_at: a.start_at, end_at: a.end_at }));

                const slots = generateSlots({
                    date: selectedFullDate,
                    serviceDuration: selectedService.duration_minutes,
                    serviceBuffer: selectedService.buffer_minutes ?? 0,
                    openingHours: (business.opening_hours ?? {}) as BusinessHours,
                    businessHourEntries: businessHourEntries.length ? businessHourEntries : undefined,
                    dateOverrides: dateOverrides.length ? dateOverrides : undefined,
                    employeeSchedules: schedules[selectedEmployee.id] ?? [],
                    existingAppointments: (existing ?? []) as ExistingAppointment[],
                    leadTimeMinutes: business.lead_time_minutes ?? 60,
                });

                setAvailableSlots(slots);
            } catch (err) {
                console.error("useAvailability: Error loading slots", err);
            } finally {
                setLoadingSlots(false);
            }
        };
        loadSlots();
    }, [selectedFullDate, selectedEmployee, selectedService, business, schedules, businessHourEntries, dateOverrides]);

    const timeGroups = useMemo(() => {
        const dopoludnia: string[] = [];
        const popoludni: string[] = [];
        availableSlots.forEach((slot) => {
            const t = format(slot, "HH:mm");
            if (slot.getHours() < 12) dopoludnia.push(t);
            else popoludni.push(t);
        });
        return { dopoludnia, popoludni };
    }, [availableSlots]);

    return {
        selectedDate,
        setSelectedDate,
        selectedFullDate,
        selectedTime,
        setSelectedTime,
        calendarMonth,
        setCalendarMonth,
        availableSlots,
        loadingSlots,
        monthStart,
        daysInMonth,
        firstDayOffset,
        today,
        maxDays,
        isEmployeeAvailableOnDay,
        isBusinessOpenOnDay,
        timeGroups
    };
}

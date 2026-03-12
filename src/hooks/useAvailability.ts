import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { startOfDay, startOfMonth, getDaysInMonth, getDay, format, addDays } from "date-fns";
import { generateSharedSlots, getEffectiveIntervals, type BusinessHours, type EmployeeSchedule, type ExistingAppointment, type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";
import { ServiceRow, EmployeeRow } from "@/components/booking/types";

export function useAvailability(
    business: any,
    businessHourEntries: BusinessHourEntry[],
    dateOverrides: DateOverrideEntry[],
    schedules: Record<string, EmployeeSchedule[]>,
    selectedService: ServiceRow | null,
    eligibleEmployees: EmployeeRow[]
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

    const buildSlots = useCallback((date: Date, existingAppointments: ExistingAppointment[]) => {
        return generateSharedSlots({
            date,
            serviceDuration: selectedService?.duration_minutes ?? 0,
            serviceBuffer: selectedService?.buffer_minutes ?? 0,
            openingHours: (business?.opening_hours ?? {}) as BusinessHours,
            businessHourEntries: businessHourEntries.length ? businessHourEntries : undefined,
            dateOverrides: dateOverrides.length ? dateOverrides : undefined,
            employeeIds: eligibleEmployees.map((employee) => employee.id),
            employeeSchedulesById: schedules,
            existingAppointments,
            leadTimeMinutes: business?.lead_time_minutes ?? 60,
        });
    }, [selectedService, business, businessHourEntries, dateOverrides, eligibleEmployees, schedules]);

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
        if (!selectedFullDate || !selectedService || !business || eligibleEmployees.length === 0) {
            setAvailableSlots([]);
            return;
        }
        const loadSlots = async () => {
            setLoadingSlots(true);
            const dayStart = startOfDay(selectedFullDate);
            const dayEnd = addDays(dayStart, 1);
            const employeeIds = eligibleEmployees.map((employee) => employee.id);

            try {
                const appointmentDocs = [];

                for (let index = 0; index < employeeIds.length; index += 10) {
                    const apptsQuery = query(
                        collection(db, "appointments"),
                        where("employee_id", "in", employeeIds.slice(index, index + 10)),
                        where("start_at", ">=", dayStart.toISOString()),
                        where("start_at", "<", dayEnd.toISOString())
                    );

                    const apptsSnap = await getDocs(apptsQuery);
                    appointmentDocs.push(...apptsSnap.docs.map((docSnap) => docSnap.data()));
                }

                const existing = appointmentDocs
                    .map((appointment: any) => ({
                        employee_id: appointment.employee_id,
                        start_at: appointment.start_at,
                        end_at: appointment.end_at,
                        status: appointment.status,
                        hold_expires_at: appointment.hold_expires_at ?? null,
                    })) as ExistingAppointment[];

                setAvailableSlots(buildSlots(selectedFullDate, existing));
            } catch (err) {
                console.error("useAvailability: Error loading slots", err);
                // Public booking must not rely on direct reads of protected appointments.
                // Server-side hold confirmation remains the source of truth for conflicts.
                setAvailableSlots(buildSlots(selectedFullDate, []));
            } finally {
                setLoadingSlots(false);
            }
        };
        loadSlots();
    }, [selectedFullDate, selectedService, business, schedules, businessHourEntries, dateOverrides, eligibleEmployees, buildSlots]);

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
        isBusinessOpenOnDay,
        timeGroups
    };
}

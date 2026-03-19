import React, { useState, useEffect, useCallback, useMemo } from "react";
import { startOfDay, startOfMonth, getDaysInMonth, getDay, format, addDays } from "date-fns";
import { generateSharedSlots, getEffectiveIntervals, type BusinessHours, type EmployeeSchedule, type ExistingAppointment, type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";
import { ServiceRow, EmployeeRow } from "@/components/booking/types";
import { getPublicAvailabilityConflicts } from "@/integrations/firebase/getPublicAvailabilityConflicts";

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
    const [availabilityStatus, setAvailabilityStatus] = useState<"idle" | "loading" | "success" | "no-slots" | "error">("idle");

    const monthStart = startOfMonth(calendarMonth);
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDayOffset = (getDay(monthStart) + 6) % 7;
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
        let isCurrentRequest = true;

        if (!selectedFullDate || !selectedService || !business) {
            setLoadingSlots(false);
            setAvailableSlots([]);
            setSelectedTime(null);
            setAvailabilityStatus("idle");
            return;
        }

        if (eligibleEmployees.length === 0) {
            setLoadingSlots(false);
            setAvailableSlots([]);
            setSelectedTime(null);
            setAvailabilityStatus("no-slots");
            return;
        }

        const loadSlots = async () => {
            setLoadingSlots(true);
            setAvailabilityStatus("loading");
            setSelectedTime(null);

            const dayStart = startOfDay(selectedFullDate);
            const dayEnd = addDays(dayStart, 1);
            const employeeIds = eligibleEmployees.map((employee) => employee.id);

            try {
                const conflicts = await getPublicAvailabilityConflicts({
                    business_id: business.id,
                    employee_ids: employeeIds,
                    day_start: dayStart.toISOString(),
                    day_end: dayEnd.toISOString(),
                });
                if (!isCurrentRequest) return;

                const existing = conflicts.map((appointment: any) => ({
                    employee_id: appointment.employee_id,
                    start_at: appointment.start_at,
                    end_at: appointment.end_at,
                    status: appointment.status,
                    hold_expires_at: appointment.hold_expires_at ?? null,
                })) as ExistingAppointment[];

                const nextSlots = buildSlots(selectedFullDate, existing);
                if (!isCurrentRequest) return;

                setAvailableSlots(nextSlots);
                setAvailabilityStatus(nextSlots.length > 0 ? "success" : "no-slots");
            } catch (err) {
                if (!isCurrentRequest) return;
                console.error("useAvailability: Error loading slots", err);
                setAvailableSlots([]);
                setSelectedTime(null);
                setAvailabilityStatus("error");
            } finally {
                if (isCurrentRequest) {
                    setLoadingSlots(false);
                }
            }
        };

        loadSlots();

        return () => {
            isCurrentRequest = false;
        };
    }, [selectedFullDate, selectedService, business, schedules, businessHourEntries, dateOverrides, eligibleEmployees, buildSlots]);

    useEffect(() => {
        if (!selectedTime) return;
        const selectedStillAvailable = availableSlots.some((slot) => format(slot, "HH:mm") === selectedTime);
        if (!selectedStillAvailable) {
            setSelectedTime(null);
        }
    }, [availableSlots, selectedTime]);

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
        availabilityStatus,
        monthStart,
        daysInMonth,
        firstDayOffset,
        today,
        maxDays,
        isBusinessOpenOnDay,
        timeGroups
    };
}

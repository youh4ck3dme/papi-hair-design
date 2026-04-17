import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { enGB, sk } from "date-fns/locale";
import { addDays, format, startOfDay } from "date-fns";


import { BookingHeader } from "@/components/booking/BookingHeader";
import { ServiceSelection } from "@/components/booking/ServiceSelection";
import { EmployeeSelection } from "@/components/booking/EmployeeSelection";
import { DateTimeSelection } from "@/components/booking/DateTimeSelection";
import { ContactConfirmation } from "@/components/booking/ContactConfirmation";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { getEffectiveIntervals, type BusinessHours } from "@/lib/availability";

import { useBookingData } from "@/hooks/useBookingData";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookingForm } from "@/hooks/useBookingForm";
import { recordBookingFunnelEvent } from "@/integrations/firebase/recordBookingFunnelEvent";

export default function BookingPage() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const dateLocale = currentLang === "en" ? enGB : sk;

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  // Phase 2: Use custom hooks
  const {
    services,
    serviceSubcategories,
    employees,
    business,
    businessHourEntries,
    dateOverrides,
    schedules,
    employeeServiceMap,
    memberships,
    initialLoading
  } = useBookingData();

  const {
    category,
    setCategory,
    subcategory,
    setSubcategory,
    selectedServiceId,
    setSelectedServiceId,
    selectedEmployeeId,
    setSelectedEmployeeId,
    formData,
    setFormData,
    contactErrors,
    submitting,
    bookingDone,
    bookingResult,
    subcategoryOptions,
    showSubcategoryStep,
    filteredServices,
    selectedService,
    filteredEmployees,
    handleCheckAll,
    handleConsentChange,
    handleSubmit
  } = useBookingForm(services, serviceSubcategories, employees, business, employeeServiceMap, memberships);
  const businessId = typeof business?.id === "string" ? business.id : "";

  const selectedAvailabilityEmployees = useMemo(() => {
    if (!selectedEmployeeId) return filteredEmployees;
    return filteredEmployees.filter((employee) => employee.id === selectedEmployeeId);
  }, [filteredEmployees, selectedEmployeeId]);

  const selectedEmployee = useMemo(
    () => filteredEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [filteredEmployees, selectedEmployeeId],
  );

  const {
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
    daysInMonth,
    firstDayOffset,
    today,
    maxDays,
    isBusinessOpenOnDay,
    timeGroups
  } = useAvailability(
    business,
    businessHourEntries,
    dateOverrides,
    schedules,
    selectedService,
    selectedAvailabilityEmployees
  );

  const employeeSectionRef = useRef<HTMLDivElement | null>(null);
  const dateTimeSectionRef = useRef<HTMLDivElement | null>(null);
  const contactSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedServiceId || selectedDate !== null) return;

    const startDate = startOfDay(today);
    const maxDate = addDays(startDate, maxDays);
    let cursor = startDate;

    while (cursor <= maxDate) {
      if (isBusinessOpenOnDay(cursor)) {
        setCalendarMonth(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
        setSelectedDate(cursor.getDate());
        break;
      }
      cursor = addDays(cursor, 1);
    }
  }, [selectedServiceId, selectedDate, today, maxDays, isBusinessOpenOnDay, setCalendarMonth, setSelectedDate]);

  useEffect(() => {
    if (!businessId) return;
    void recordBookingFunnelEvent({
      business_id: businessId,
      event_name: "booking_started",
      category,
      dedupe_key: `booking_started:${businessId}`,
    });
  }, [businessId, category]);

  useEffect(() => {
    if (!businessId || !category) return;
    void recordBookingFunnelEvent({
      business_id: businessId,
      event_name: "category_selected",
      category,
      dedupe_key: `category_selected:${businessId}:${category}`,
    });
  }, [businessId, category]);

  useEffect(() => {
    if (!businessId || !subcategory) return;
    const selectedSubcategoryName =
      subcategoryOptions.find((option) => option.key === subcategory)?.name_sk ?? subcategory;

    void recordBookingFunnelEvent({
      business_id: businessId,
      event_name: "subcategory_selected",
      category,
      subcategory: selectedSubcategoryName,
      dedupe_key: `subcategory_selected:${businessId}:${subcategory}`,
    });
  }, [businessId, category, subcategory, subcategoryOptions]);

  useEffect(() => {
    if (!businessId || !selectedServiceId) return;
    void recordBookingFunnelEvent({
      business_id: businessId,
      event_name: "service_selected",
      category,
      subcategory:
        subcategoryOptions.find((option) => option.key === subcategory)?.name_sk ?? subcategory,
      service_id: selectedServiceId,
      dedupe_key: `service_selected:${businessId}:${selectedServiceId}`,
    });
  }, [businessId, category, selectedServiceId, subcategory, subcategoryOptions]);

  useEffect(() => {
    if (!businessId || !selectedEmployeeId) return;
    void recordBookingFunnelEvent({
      business_id: businessId,
      event_name: "employee_selected",
      category,
      subcategory:
        subcategoryOptions.find((option) => option.key === subcategory)?.name_sk ?? subcategory,
      service_id: selectedServiceId,
      employee_id: selectedEmployeeId,
      dedupe_key: `employee_selected:${businessId}:${selectedServiceId ?? "none"}:${selectedEmployeeId}`,
    });
  }, [businessId, category, selectedEmployeeId, selectedServiceId, subcategory, subcategoryOptions]);

  useEffect(() => {
    if (!businessId || !selectedTime || !selectedFullDate) return;
    void recordBookingFunnelEvent({
      business_id: businessId,
      event_name: "slot_selected",
      category,
      subcategory:
        subcategoryOptions.find((option) => option.key === subcategory)?.name_sk ?? subcategory,
      service_id: selectedServiceId,
      employee_id: selectedEmployeeId,
      slot_at: selectedFullDate.toISOString(),
      dedupe_key: `slot_selected:${businessId}:${selectedFullDate.toISOString()}:${selectedTime}`,
    });
  }, [
    businessId,
    category,
    selectedEmployeeId,
    selectedFullDate,
    selectedServiceId,
    selectedTime,
    subcategory,
    subcategoryOptions,
  ]);

  useEffect(() => {
    if (!businessId || !bookingDone) return;
    void recordBookingFunnelEvent({
      business_id: businessId,
      event_name: "booking_confirmed",
      category,
      subcategory:
        subcategoryOptions.find((option) => option.key === subcategory)?.name_sk ?? subcategory,
      service_id: selectedServiceId,
      employee_id: selectedEmployeeId,
      slot_at: selectedFullDate?.toISOString() ?? null,
      dedupe_key: `booking_confirmed:${businessId}:${bookingResult?.history_reference ?? selectedTime ?? "done"}`,
    });
  }, [
    bookingDone,
    bookingResult?.history_reference,
    businessId,
    category,
    selectedEmployeeId,
    selectedFullDate,
    selectedServiceId,
    selectedTime,
    subcategory,
    subcategoryOptions,
  ]);

  useEffect(() => {
    if (!selectedServiceId) return;
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;

    requestAnimationFrame(() => {
      employeeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedServiceId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;

    requestAnimationFrame(() => {
      dateTimeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId) return;
    setSelectedTime(null);
  }, [selectedEmployeeId, setSelectedTime]);

  useEffect(() => {
    if (!selectedTime) return;
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;

    requestAnimationFrame(() => {
      contactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedTime]);

  const isBusinessOpenNow = useMemo(() => {
    if (!business) return false;

    const now = new Date();
    const intervals = getEffectiveIntervals(
      now,
      businessHourEntries,
      dateOverrides,
      business.opening_hours as BusinessHours | undefined
    );

    if (!intervals?.length) return false;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return intervals.some(({ start, end }) => {
      const [startHour, startMinute] = start.split(":").map((v) => Number(v));
      const [endHour, endMinute] = end.split(":").map((v) => Number(v));
      if ([startHour, startMinute, endHour, endMinute].some((v) => Number.isNaN(v))) return false;

      const intervalStart = startHour * 60 + startMinute;
      const intervalEnd = endHour * 60 + endMinute;
      return nowMinutes >= intervalStart && nowMinutes < intervalEnd;
    });
  }, [business, businessHourEntries, dateOverrides]);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookingDone && bookingResult) {
    return (
      <BookingSuccess
        bookingResult={bookingResult}
        selectedService={selectedService}
        selectedFullDate={selectedFullDate}
        selectedTime={selectedTime}
        dateLocale={dateLocale}
      />
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-black text-foreground transition-colors duration-300 safe-x"
      data-testid="booking-page"
    >
      <div className="mx-auto w-full max-w-md overflow-x-hidden shadow-2xl lg:max-w-6xl lg:shadow-none">
        <BookingHeader isDark={isDark} setTheme={setTheme} />

        {/* Gold progress bar */}
        {(() => {
          const steps = [category, selectedServiceId, selectedEmployeeId, selectedTime].filter(Boolean).length;
          const pct = (steps / 4) * 100;
          return steps > 0 ? (
            <div className="h-0.5 w-full bg-white/5">
              <div
                className="h-full bg-[#C9A84C] transition-all duration-500 ease-out"
                style={{ width: `${pct}%`, boxShadow: "0 0 6px rgba(201,168,76,0.7)" }}
              />
            </div>
          ) : null;
        })()}

        {selectedService && (
          <div className="px-4 pt-5 lg:px-6">
            <div className="grid gap-3 rounded-3xl border border-primary/15 bg-[linear-gradient(180deg,rgba(218,165,32,0.09),rgba(218,165,32,0.03))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.18)] lg:grid-cols-3">
              <div className="min-w-0 rounded-xl border border-white/6 bg-black/20 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  {i18n.language === "en" ? "Service" : "Služba"}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{selectedService.name_sk}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-white/6 bg-black/20 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  {i18n.language === "en" ? "Stylist" : "Kaderník"}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {selectedEmployee?.display_name ?? (i18n.language === "en" ? "Choose stylist" : "Vyber kaderníka")}
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-white/6 bg-black/20 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  {i18n.language === "en" ? "Appointment" : "Termín"}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {selectedFullDate && selectedTime
                    ? `${format(selectedFullDate, "d. M.", { locale: dateLocale })} • ${selectedTime}`
                    : i18n.language === "en"
                      ? "Choose date and time"
                      : "Vyber dátum a čas"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pb-24 pt-1 lg:px-2 lg:pb-12">
          <ServiceSelection
            category={category}
            setCategory={setCategory}
            subcategory={subcategory}
            setSubcategory={setSubcategory}
            subcategoryOptions={subcategoryOptions}
            showSubcategoryStep={showSubcategoryStep}
            filteredServices={filteredServices}
            selectedServiceId={selectedServiceId}
            setSelectedServiceId={setSelectedServiceId}
            isBusinessOpenNow={isBusinessOpenNow}
            onCategoryChange={() => {
              setSelectedDate(null);
              setSelectedTime(null);
            }}
          />

          {selectedServiceId && (
            <div
              className={
                selectedEmployeeId
                  ? "lg:grid lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-start lg:gap-6"
                  : undefined
              }
            >
              <div className="space-y-2">
                <div ref={employeeSectionRef}>
                  <EmployeeSelection
                    employees={filteredEmployees}
                    isLoading={initialLoading}
                    selectedEmployeeId={selectedEmployeeId}
                    setSelectedEmployeeId={setSelectedEmployeeId}
                  />
                </div>
              </div>

              {selectedEmployeeId && (
                <div ref={dateTimeSectionRef}>
                  <DateTimeSelection
                    calendarMonth={calendarMonth}
                    setCalendarMonth={setCalendarMonth}
                    dateLocale={dateLocale}
                    firstDayOffset={firstDayOffset}
                    daysInMonth={daysInMonth}
                    today={today}
                    maxDays={maxDays}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedFullDate={selectedFullDate}
                    setSelectedTime={setSelectedTime}
                    isBusinessOpenOnDay={isBusinessOpenOnDay}
                    loadingSlots={loadingSlots}
                    availabilityStatus={availabilityStatus}
                    availableSlots={availableSlots}
                    selectedTime={selectedTime}
                    timeGroups={timeGroups}
                  />
                </div>
              )}
            </div>
          )}

          {selectedEmployeeId && selectedTime && (
            <div ref={contactSectionRef} className="pt-2 lg:mx-auto lg:max-w-3xl">
              <ContactConfirmation
                formData={formData}
                setFormData={setFormData}
                contactErrors={contactErrors}
                handleCheckAll={handleCheckAll}
                handleConsentChange={handleConsentChange}
                selectedService={selectedService}
                selectedFullDate={selectedFullDate}
                selectedTime={selectedTime}
                dateLocale={dateLocale}
                submitting={submitting}
                handleSubmit={() => handleSubmit(selectedTime, availableSlots, selectedEmployeeId)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

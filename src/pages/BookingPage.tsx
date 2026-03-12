import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { enGB, sk } from "date-fns/locale";


import { BookingHeader } from "@/components/booking/BookingHeader";
import { ServiceSelection } from "@/components/booking/ServiceSelection";
import { DateTimeSelection } from "@/components/booking/DateTimeSelection";
import { ContactConfirmation } from "@/components/booking/ContactConfirmation";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { getEffectiveIntervals, type BusinessHours } from "@/lib/availability";

import { useBookingData } from "@/hooks/useBookingData";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookingForm } from "@/hooks/useBookingForm";

export default function BookingPage() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const dateLocale = currentLang === "en" ? enGB : sk;

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  // Phase 2: Use custom hooks
  const {
    services,
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
    formData,
    setFormData,
    contactErrors,
    submitting,
    bookingDone,
    bookingResult,
    subcategories,
    filteredServices,
    selectedService,
    filteredEmployees,
    handleCheckAll,
    handleConsentChange,
    handleSubmit
  } = useBookingForm(services, employees, business, employeeServiceMap, memberships);

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
    daysInMonth,
    firstDayOffset,
    today,
    maxDays,
    isBusinessOpenOnDay,
    timeGroups
  } = useAvailability(business, businessHourEntries, dateOverrides, schedules, selectedService, filteredEmployees);

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
    <div className="min-h-[100dvh] font-sans pb-24 max-w-md w-full mx-auto shadow-2xl relative overflow-x-hidden transition-colors duration-300 bg-background text-foreground safe-x" data-testid="booking-page">
      <BookingHeader isDark={isDark} setTheme={setTheme} />

      <ServiceSelection
        category={category}
        setCategory={setCategory}
        subcategory={subcategory}
        setSubcategory={setSubcategory}
        subcategories={subcategories}
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
          availableSlots={availableSlots}
          selectedTime={selectedTime}
          timeGroups={timeGroups}
        />
      )}

      {selectedTime && (
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
          handleSubmit={() => handleSubmit(selectedTime, availableSlots)}
        />
      )}
    </div>
  );
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { enGB, sk } from "date-fns/locale";

import miskaImg from "@/assets/employee-miska.jpeg";
import matoImg from "@/assets/employee-mato.jpg";

import { BookingHeader } from "@/components/booking/BookingHeader";
import { ServiceSelection } from "@/components/booking/ServiceSelection";
import { EmployeeSelection } from "@/components/booking/EmployeeSelection";
import { DateTimeSelection } from "@/components/booking/DateTimeSelection";
import { ContactConfirmation } from "@/components/booking/ContactConfirmation";
import { BookingSuccess } from "@/components/booking/BookingSuccess";

import { useBookingData } from "@/hooks/useBookingData";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookingForm } from "@/hooks/useBookingForm";

// Map employee IDs to local photos
const EMPLOYEE_PHOTOS: Record<string, string> = {
  "c1000000-0000-0000-0000-000000000001": miskaImg,
  "c1000000-0000-0000-0000-000000000002": matoImg,
};

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
    selectedWorkerId,
    setSelectedWorkerId,
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
    selectedEmployee,
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
    monthStart,
    daysInMonth,
    firstDayOffset,
    today,
    maxDays,
    isEmployeeAvailableOnDay,
    isBusinessOpenOnDay,
    timeGroups
  } = useAvailability(business, businessHourEntries, dateOverrides, schedules, selectedService, selectedEmployee);

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
        selectedEmployee={selectedEmployee}
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
        onCategoryChange={() => {
          setSelectedWorkerId(null);
          setSelectedDate(null);
          setSelectedTime(null);
        }}
      />

      {selectedServiceId && (
        <EmployeeSelection
          filteredEmployees={filteredEmployees}
          selectedWorkerId={selectedWorkerId}
          setSelectedWorkerId={setSelectedWorkerId}
          employeePhotos={EMPLOYEE_PHOTOS}
          onEmployeeSelect={() => {
            setSelectedDate(null);
            setSelectedTime(null);
          }}
        />
      )}

      {selectedWorkerId && (
        <DateTimeSelection
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          dateLocale={dateLocale}
          firstDayOffset={firstDayOffset}
          daysInMonth={daysInMonth}
          today={today}
          maxDays={maxDays}
          selectedWorkerId={selectedWorkerId}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedFullDate={selectedFullDate}
          setSelectedTime={setSelectedTime}
          isBusinessOpenOnDay={isBusinessOpenOnDay}
          isEmployeeAvailableOnDay={isEmployeeAvailableOnDay}
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
          selectedEmployee={selectedEmployee}
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

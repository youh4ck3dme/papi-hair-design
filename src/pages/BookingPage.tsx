import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { BriefcaseBusiness, Phone } from "lucide-react";
import { enGB, sk } from "date-fns/locale";
import { addDays, format, startOfDay } from "date-fns";


import { BookingHeader } from "@/components/booking/BookingHeader";
import { ServiceSelection } from "@/components/booking/ServiceSelection";
import { EmployeeSelection } from "@/components/booking/EmployeeSelection";
import { DateTimeSelection } from "@/components/booking/DateTimeSelection";
import { ContactConfirmation } from "@/components/booking/ContactConfirmation";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { PublicAtmosphereBackground } from "@/components/public/PublicAtmosphereBackground";
import { PremiumLoadingState } from "@/components/ui/premium-loading-state";
import { getEffectiveIntervals, type BusinessHours } from "@/lib/availability";
import { APP_BRAND_NAME, APP_CONTACT_PHONE, APP_CONTACT_PHONE_DISPLAY } from "@/lib/brandConfig";
import { APP_LOGO_SRC } from "@/lib/branding";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_CALENDAR_PATH, hasOwnerAdminMembershipForBusiness } from "@/lib/adminRouteSecurity";

import { useBookingData } from "@/hooks/useBookingData";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookingForm } from "@/hooks/useBookingForm";

export default function BookingPage() {
  const { i18n } = useTranslation();
  const { user, memberships: authMemberships, loading: authLoading } = useAuth();
  const currentLang = i18n.language;
  const dateLocale = currentLang === "en" ? enGB : sk;

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
    setContactErrors,
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
  const serviceSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToSection = (target: HTMLElement | null, offset = 112) => {
    if (!target || typeof window === "undefined") return;

    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth",
    });
  };

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
    if (!subcategory || selectedServiceId) return;
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;

    requestAnimationFrame(() => {
      scrollToSection(serviceSectionRef.current);
    });
  }, [subcategory, selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId) return;
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;

    requestAnimationFrame(() => {
      scrollToSection(employeeSectionRef.current);
    });
  }, [selectedServiceId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;

    requestAnimationFrame(() => {
      scrollToSection(dateTimeSectionRef.current);
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
      scrollToSection(contactSectionRef.current);
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
  const canOpenAdminCalendar =
    Boolean(user) &&
    !authLoading &&
    Boolean(business?.id) &&
    hasOwnerAdminMembershipForBusiness(authMemberships, business?.id);

  if (initialLoading) {
    return (
      <main className="relative min-h-[100svh] overflow-hidden bg-black text-foreground safe-x">
        <PublicAtmosphereBackground />
        <div className="relative z-10 flex min-h-[100svh] items-center px-4 py-8 sm:px-6">
          <div className="mx-auto w-full max-w-[780px]">
            <PremiumLoadingState
              variant="public"
              eyebrow={currentLang === "en" ? "Booking" : "Rezervácia"}
              title={currentLang === "en" ? "Preparing the booking calendar" : "Pripravujeme rezervačný kalendár"}
              description={
                currentLang === "en"
                  ? "We are loading services, stylists and available times so your reservation can stay smooth from the first tap."
                  : "Načítavame služby, kaderníkov a dostupné termíny, aby vaša rezervácia pokračovala plynulo od prvého kroku."
              }
              testId="booking-loading-state"
            />
          </div>
        </div>
      </main>
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
    <main
      className="relative min-h-[100svh] overflow-hidden bg-black text-foreground transition-colors duration-300 safe-x"
      data-testid="booking-page"
    >
      <PublicAtmosphereBackground />

      <div
        className="relative z-10 flex min-h-[100svh] flex-col"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="px-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
          <div className="mx-auto max-w-[780px]">
            <BookingHeader />
          </div>
        </div>

        <div className="flex flex-1 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 md:pb-10">
          <div className="mx-auto flex w-full max-w-[780px] flex-col">
            <section
              className="public-premium-shell relative mt-10 w-full pb-6 pt-16 backdrop-blur-2xl backdrop-saturate-[120%] sm:mt-12 md:pb-8 md:pt-20"
              data-testid="booking-hero-shell"
            >
              <div className="public-premium-topglow" aria-hidden="true" />
              <div className="pointer-events-none absolute left-5 top-5 h-8 w-8 rounded-tl-lg border-l border-t border-gold/30" aria-hidden="true" />
              <div className="pointer-events-none absolute right-5 top-5 h-8 w-8 rounded-tr-lg border-r border-t border-gold/30" aria-hidden="true" />
              <div className="pointer-events-none absolute bottom-5 left-5 h-8 w-8 rounded-bl-lg border-b border-l border-gold/30" aria-hidden="true" />
              <div className="pointer-events-none absolute bottom-5 right-5 h-8 w-8 rounded-br-lg border-b border-r border-gold/30" aria-hidden="true" />

              <div
                className="absolute left-1/2 top-0 z-20 h-[92px] w-[92px] -translate-x-1/2 -translate-y-12 overflow-hidden rounded-full bg-ink-100"
                style={{ boxShadow: "var(--shadow-medallion)" }}
                data-testid="booking-hero-logo"
              >
                <img src={APP_LOGO_SRC} alt={APP_BRAND_NAME} className="h-full w-full object-cover" />
              </div>

              <div className="px-6 text-center md:px-10">
                <p className="mb-3 mt-1 select-none text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-gold/70 sm:text-[11px]">
                  {currentLang === "en" ? "Online booking" : "Online rezervácia"}
                </p>
                <h1
                  className="text-balance text-center text-[30px] font-bold leading-tight tracking-[0.06em] text-text-primary sm:text-[38px] md:text-[44px]"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.80)" }}
                >
                  {currentLang === "en" ? "Book your appointment" : "Rezervujte si termín"}
                </h1>
                <div className="public-premium-panel mx-auto mt-5 max-w-2xl px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:px-5">
                  <div className="grid grid-cols-[auto,1fr] items-start gap-x-3 gap-y-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.08] text-gold">
                      <Phone className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <p
                      data-testid="booking-papi-consultation-text"
                      className="min-w-0 text-sm leading-7 text-white/84 md:text-[15px]"
                    >
                        {currentLang === "en"
                          ? 'Appointments with Róbert Papcun "PAPI" require a consultation, which you can arrange by phone.'
                          : 'Rezervácie k Róbertovi Papcunovi "PAPI" si vyžadujú konzultáciu, ktorú si viete dohodnúť telefonicky.'}
                    </p>
                    <div className="col-start-2 flex flex-wrap items-center gap-3">
                        <a
                          href={`tel:${APP_CONTACT_PHONE}`}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-[7px] border border-gold/35 bg-gold/[0.08] px-4 py-2 text-sm font-semibold text-gold transition-colors hover:border-gold/60 hover:bg-gold/[0.14]"
                        >
                          <Phone className="h-4 w-4" strokeWidth={1.9} />
                          <span>{APP_CONTACT_PHONE_DISPLAY}</span>
                        </a>
                        <a
                          href={`tel:${APP_CONTACT_PHONE}`}
                          className="inline-flex min-h-[44px] items-center rounded-[7px] border border-gold/45 bg-gradient-to-b from-ink-700 to-ink-600 px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] text-text-primary transition-colors hover:border-gold/70 hover:from-ink-800 hover:to-ink-700"
                        >
                          {currentLang === "en" ? "Call" : "Volať"}
                        </a>
                    </div>
                  </div>
                </div>
                {canOpenAdminCalendar && (
                  <a
                    href={ADMIN_CALENDAR_PATH}
                    className="mx-auto mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-gold/35 bg-black/24 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-gold transition-colors hover:border-gold/60 hover:bg-gold/[0.10]"
                  >
                    <BriefcaseBusiness className="h-4 w-4" strokeWidth={1.8} />
                    <span>{currentLang === "en" ? "Open salon calendar" : "Otvoriť kalendár prevádzky"}</span>
                  </a>
                )}
                <div className="mt-5 hidden flex-wrap justify-center gap-2.5 sm:flex">
                  {[
                    currentLang === "en" ? "Men's services" : "Pánske služby",
                    currentLang === "en" ? "Women's services" : "Dámske služby",
                    currentLang === "en" ? "Additional services" : "Doplnkové služby",
                  ].map((text) => (
                    <span
                      key={text}
                      className="select-none rounded-full border border-gold/30 bg-gold/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-label sm:text-[12px]"
                    >
                      {text}
                    </span>
                  ))}
                </div>
              </div>

              {(() => {
                const steps = [category, selectedServiceId, selectedEmployeeId, selectedTime].filter(Boolean).length;
                const pct = (steps / 4) * 100;
                return steps > 0 ? (
                  <div className="mt-8 px-6 md:px-10">
                    <div className="h-0.5 w-full bg-white/5">
                      <div
                        className="h-full bg-[#C9A84C] transition-all duration-500 ease-out"
                        style={{ width: `${pct}%`, boxShadow: "0 0 6px rgba(201,168,76,0.7)" }}
                      />
                    </div>
                  </div>
                ) : null;
              })()}

              {selectedService && (
                <div className="px-6 pt-5 md:px-10">
                  <div className="public-premium-panel grid gap-3 border-primary/15 bg-[linear-gradient(180deg,rgba(218,165,32,0.09),rgba(218,165,32,0.03))] p-4 lg:grid-cols-3">
                    <div className="min-w-0 rounded-[16px] border border-white/6 bg-black/20 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                        {i18n.language === "en" ? "Service" : "Služba"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-white">{selectedService.name_sk}</p>
                    </div>
                    <div className="min-w-0 rounded-[16px] border border-white/6 bg-black/20 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                        {i18n.language === "en" ? "Stylist" : "Kaderník"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-white">
                        {selectedEmployee?.display_name ?? (i18n.language === "en" ? "Choose stylist" : "Vyber kaderníka")}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-[16px] border border-white/6 bg-black/20 px-3 py-3">
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

              <div className="pb-6 pt-2 md:pb-8">
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
                  servicesSectionRef={serviceSectionRef}
                />

                {selectedServiceId && (
                  <div
                    className={
                      selectedEmployeeId
                        ? "lg:grid lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-start lg:gap-6"
                        : undefined
                    }
                  >
                    <div className="space-y-1">
                      <div ref={employeeSectionRef}>
                        <EmployeeSelection
                          employees={filteredEmployees}
                          isLoading={initialLoading}
                          selectedEmployeeId={selectedEmployeeId}
                          setSelectedEmployeeId={setSelectedEmployeeId}
                          onBackToService={() => {
                            setSelectedEmployeeId(null);
                            setSelectedTime(null);
                            requestAnimationFrame(() => {
                              scrollToSection(serviceSectionRef.current);
                            });
                          }}
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
                  <div ref={contactSectionRef} className="lg:mx-auto lg:max-w-3xl">
                    <ContactConfirmation
                      formData={formData}
                      setFormData={setFormData}
                      contactErrors={contactErrors}
                      setContactErrors={setContactErrors}
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
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createPublicBooking } from "@/integrations/supabase/createPublicBooking";
import { getRecaptchaToken } from "@/lib/recaptcha";
import { generateSlots, getEffectiveIntervals, type BusinessHours, type EmployeeSchedule, type ExistingAppointment, type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";

import { toast } from "sonner";
import { startOfDay, startOfMonth, getDaysInMonth, getDay, format, isBefore, isAfter, addDays, isSameDay } from "date-fns";
import { sk, enGB } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import { z } from "zod";
import { useTheme } from "next-themes";
import { User, Mail, Phone, PenLine, ChevronLeft, ChevronRight, Star, Check, Moon, Sun, Loader2 } from "lucide-react";
import miskaImg from "@/assets/employee-miska.jpeg";
import matoImg from "@/assets/employee-mato.jpg";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

import { BookingHeader } from "@/components/booking/BookingHeader";
import { ServiceSelection } from "@/components/booking/ServiceSelection";
import { EmployeeSelection } from "@/components/booking/EmployeeSelection";
import { DateTimeSelection } from "@/components/booking/DateTimeSelection";
import { ContactConfirmation } from "@/components/booking/ContactConfirmation";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { ServiceRow, EmployeeRow, BookingResult, contactSchema, MembershipRow } from "@/components/booking/types";
import { GoldText } from "@/components/booking/BookingUI";

// Map employee IDs to local photos
const EMPLOYEE_PHOTOS: Record<string, string> = {
  "c1000000-0000-0000-0000-000000000001": miskaImg,
  "c1000000-0000-0000-0000-000000000002": matoImg,
};

export default function BookingPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const dateLocale = currentLang === "en" ? enGB : sk;

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  // Data states
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [business, setBusiness] = useState<{
    id: string;
    name: string;
    allow_admin_as_provider?: boolean;
    max_days_ahead?: number;
    lead_time_minutes?: number;
    opening_hours?: unknown;
  } | null>(null);
  const [businessHourEntries, setBusinessHourEntries] = useState<BusinessHourEntry[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverrideEntry[]>([]);
  const [schedules, setSchedules] = useState<Record<string, EmployeeSchedule[]>>({});
  const [employeeServiceMap, setEmployeeServiceMap] = useState<Record<string, string[]>>({});
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Booking states
  const [category, setCategory] = useState<"damske" | "panske">("damske");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    meno: "", priezvisko: "", email: "", phone: "", note: "",
    marketing: false, terms: false, all: false,
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Availability
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load initial data from Supabase
  useEffect(() => {
    const load = async () => {
      setInitialLoading(true);
      try {
        const [bizRes, svcRes, empRes, bhRes, bdoRes] = await Promise.all([
          supabase.from("businesses").select("*").eq("id", DEMO_BUSINESS_ID).single(),
          supabase.from("services").select("*").eq("business_id", DEMO_BUSINESS_ID).eq("is_active", true).order("sort_order").order("name_sk"),
          supabase.from("employees").select("*").eq("business_id", DEMO_BUSINESS_ID).eq("is_active", true).order("display_name"),
          supabase.from("business_hours").select("*").eq("business_id", DEMO_BUSINESS_ID).order("sort_order"),
          supabase.from("business_date_overrides").select("*").eq("business_id", DEMO_BUSINESS_ID).gte("override_date", new Date().toISOString().slice(0, 10)),
        ]);

        if (bizRes.data) {
          const d = bizRes.data;
          setBusiness({
            id: DEMO_BUSINESS_ID,
            name: d.name,
            allow_admin_as_provider: (d as any).allow_admin_as_provider,
            max_days_ahead: (d as any).max_days_ahead,
            lead_time_minutes: (d as any).lead_time_minutes,
            opening_hours: (d as any).opening_hours
          });
        }
        setServices(svcRes.data ?? []);
        setEmployees(empRes.data ?? []);
        setBusinessHourEntries((bhRes.data ?? []).map((h: any) => ({
          day_of_week: h.day_of_week,
          mode: h.mode,
          start_time: h.start_time,
          end_time: h.end_time
        })));
        setDateOverrides((bdoRes.data ?? []).map((o: any) => ({
          override_date: o.override_date,
          mode: o.mode,
          start_time: o.start_time ?? null,
          end_time: o.end_time ?? null
        })));

        const empIds = (empRes.data ?? []).map((e: any) => e.id);
        if (empIds.length) {
          const { data: scheds } = await supabase.from("schedules").select("*").in("employee_id", empIds.slice(0, 10));
          const map: Record<string, EmployeeSchedule[]> = {};
          (scheds ?? []).forEach((s: any) => {
            const eid = s.employee_id;
            if (!map[eid]) map[eid] = [];
            map[eid].push({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time });
          });
          setSchedules(map);
        }

        const { data: esData } = await supabase
          .from("employee_services")
          .select("employee_id, service_id, employees!inner(business_id)")
          .eq("employees.business_id", DEMO_BUSINESS_ID);
        // FORCE RE-PATCH: We ensured this query uses employees!inner to avoid 400 error.
        // If 400 persists in browser, a full rebuild/sync is required.
        const eMap: Record<string, string[]> = {};
        (esData ?? []).forEach((d: any) => {
          const eid = d.employee_id;
          if (!eMap[eid]) eMap[eid] = [];
          eMap[eid].push(d.service_id);
        });
        setEmployeeServiceMap(eMap);

        const { data: memData } = await supabase.from("memberships").select("*").eq("business_id", DEMO_BUSINESS_ID);
        setMemberships((memData ?? []).map((d: any) => ({ profile_id: d.profile_id, role: d.role })) as MembershipRow[]);

      } catch (error_) {
        console.warn("BookingPage: failed to load Supabase data", error_);
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, []);


  // Derived: grouped subcategories
  const subcategories = useMemo(() => {
    const cats = services
      .filter((s): s is typeof s & { subcategory: string } => s.category === category && Boolean(s.subcategory))
      .map((s) => s.subcategory);
    return [...new Set(cats)].sort((a, b) => a.localeCompare(b));
  }, [services, category]);

  // Derived: filtered services for selected subcategory
  const filteredServices = useMemo(() => {
    if (!subcategory) return [];
    return services.filter((s) => s.category === category && s.subcategory === subcategory);
  }, [services, category, subcategory]);

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  // Filter employees based on selected service and admin setting
  const filteredEmployees = useMemo(() => {
    let result = employees;

    // Filter by service assignment
    if (selectedServiceId) {
      result = result.filter(emp => {
        if (!employeeServiceMap[emp.id]) return true;
        return employeeServiceMap[emp.id].includes(selectedServiceId);
      });
    }

    // Filter admins/owners based on allow_admin_as_provider setting
    if (!business?.allow_admin_as_provider) {
      result = result.filter(emp => {
        // If no profile_id, employee is not linked to a user - always allow
        if (!emp.profile_id) return true;
        // Find membership for this employee's profile
        const membership = memberships.find(m => m.profile_id === emp.profile_id);
        // If no membership, allow (legacy employee)
        if (!membership) return true;
        // Allow only employees (not admin/owner) when setting is false
        return membership.role === "employee";
      });
    }

    return result;
  }, [employees, selectedServiceId, employeeServiceMap, business, memberships]);

  const selectedEmployee = employees.find((e) => e.id === selectedWorkerId) ?? null;

  // Calendar helpers
  const today = startOfDay(new Date());
  const maxDays = business?.max_days_ahead ?? 60;
  const monthStart = startOfMonth(calendarMonth);
  const daysInMonth = getDaysInMonth(calendarMonth);
  const firstDayOffset = (getDay(monthStart) + 6) % 7; // Monday-first

  // Build actual Date for selected calendar day
  const selectedFullDate = useMemo(() => {
    if (!selectedDate) return null;
    return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), selectedDate);
  }, [selectedDate, calendarMonth]);

  // Check if employee available on a day
  const isEmployeeAvailableOnDay = useCallback((empId: string, date: Date) => {
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
    return (schedules[empId] ?? []).some((s) => s.day_of_week === dayName);
  }, [schedules]);

  // Check if business is open on a day
  const isBusinessOpenOnDay = useCallback((date: Date) => {
    const intervals = getEffectiveIntervals(
      date,
      businessHourEntries,
      dateOverrides,
      business?.opening_hours as BusinessHours | undefined
    );
    return !!(intervals && intervals.length > 0);
  }, [businessHourEntries, dateOverrides, business]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedFullDate || !selectedEmployee || !selectedService || !business) {
      setAvailableSlots([]);
      return;
    }
    const loadSlots = async () => {
      setLoadingSlots(true);
      const dayStart = startOfDay(selectedFullDate);
      const dayEnd = addDays(dayStart, 1);

      const { data: appts } = await supabase
        .from("appointments")
        .select("start_at, end_at")
        .eq("employee_id", selectedEmployee.id)
        .neq("status", "cancelled")
        .gte("start_at", dayStart.toISOString())
        .lt("start_at", dayEnd.toISOString());

      const existing = (appts ?? []).map((a: any) => ({ start_at: a.start_at, end_at: a.end_at }));


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
      setLoadingSlots(false);
    };
    loadSlots();
  }, [selectedFullDate, selectedEmployee, selectedService, business, schedules, businessHourEntries, dateOverrides]);

  // Group available slots
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

  // Consent handlers
  const handleCheckAll = () => {
    const newValue = !formData.all;
    setFormData({ ...formData, all: newValue, marketing: newValue, terms: newValue });
  };
  const handleConsentChange = (field: "marketing" | "terms") => {
    const newData = { ...formData, [field]: !formData[field] };
    newData.all = newData.marketing && newData.terms;
    setFormData(newData);
  };

  // Submit booking
  const handleSubmit = async () => {
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setContactErrors(errs);
      return;
    }
    if (!formData.terms) {
      toast.error(t("booking.toastTermsRequired"));
      return;
    }
    setContactErrors({});
    setSubmitting(true);

    // Find the actual slot Date
    const slotDate = availableSlots.find((s) => format(s, "HH:mm") === selectedTime);
    if (!slotDate) {
      toast.error(t("booking.toastSlotTaken"));
      setSubmitting(false);
      return;
    }

    try {
      const serviceId = selectedServiceId ?? null;
      const workerId = selectedWorkerId ?? null;
      if (!serviceId || !workerId) {
        setSubmitting(false);
        return;
      }
      const recaptchaToken = await getRecaptchaToken("booking");
      const data = await createPublicBooking({
        business_id: DEMO_BUSINESS_ID,
        service_id: serviceId,
        employee_id: workerId,
        start_at: slotDate.toISOString(),
        customer_name: `${formData.meno} ${formData.priezvisko}`.trim(),
        customer_email: formData.email,
        customer_phone: formData.phone || undefined,
        recaptcha_token: recaptchaToken ?? undefined,
      });

      if (data.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }

      setBookingResult(data);
      setBookingDone(true);
      toast.success(t("booking.toastSuccess"));
    } catch {
      toast.error(t("booking.toastServerError"));
    }
    setSubmitting(false);
  };

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
          handleSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

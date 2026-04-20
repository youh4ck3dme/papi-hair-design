import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  addDays,
  addWeeks,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { startOfDayInTZ } from "@/lib/timezone";
import { AnimatePresence, motion } from "framer-motion";
import { db, functions } from "@/integrations/firebase/config";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { adminUpdateBookingStatus } from "@/integrations/firebase/adminUpdateBookingStatus";
import GlassHeader from "./GlassHeader";
import MonthGrid from "./MonthGrid";
import WeekTimeline from "./WeekTimeline";
import type { CalendarView } from "./CalendarViewSwitcher";
import type { CalendarAppointment } from "./AppointmentBlock";
import QuickBookingSheet from "@/components/booking/QuickBookingSheet";
import AppointmentDetailSheet from "@/components/booking/AppointmentDetailSheet";
import BlockTimeSheet from "@/components/booking/BlockTimeSheet";
import EmployeeFilter from "./mobile/EmployeeFilter";
import CalendarToolbar from "./mobile/CalendarToolbar";
import CalendarGrid from "./mobile/CalendarGrid";
import type { CalendarEvent, DayException, Employee, WorkingSchedule } from "./mobile/types";
import {
  BLOCK_CUSTOMER_EMAIL,
  BLOCK_SERVICE_NAME,
  getBlockedReason,
  isBlockedAppointmentNote,
  makeBlockedNote,
} from "./mobile/blocking";
import {
  buildDayExceptionsFromBusinessOverrides,
  mapAppointmentRowToCalendarAppointment,
} from "./mobile/event-mappers";

const DEMO_BUSINESS_ID = "papi-hair-design-main";
const SWIPE_THRESHOLD = 60;
const BUSINESS_TZ = "Europe/Bratislava";

const EMPLOYEE_COLOR_ORDER = ["#22c55e", "#ec4899", "#3b82f6", "#f97316", "#a855f7", "#14b8a6"];

const DAY_INDEX: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

type ServiceOption = {
  id: string;
  name_sk: string | null;
  duration_minutes: number;
  price: number | null;
};

export default function MobileCalendarShell() {
  const [currentDate, setCurrentDate] = useState(() =>
    startOfDayInTZ(new Date(), BUSINESS_TZ),
  );
  const [view, setView] = useState<CalendarView>("day");
  const [direction, setDirection] = useState(0);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [scheduleRows, setScheduleRows] = useState<any[]>([]);
  const [dayExceptions, setDayExceptions] = useState<DayException[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [blockTimeOpen, setBlockTimeOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<Date | null>(null);
  const [selectedApt, setSelectedApt] = useState<CalendarAppointment | null>(null);

  const blockCustomerIdRef = useRef<string | null>(null);
  const blockServiceIdRef = useRef<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const loadStaticData = useCallback(async () => {
    try {
      const servicesRef = collection(db, "services");
      const servicesQuery = query(
        servicesRef,
        where("business_id", "==", DEMO_BUSINESS_ID),
        where("is_active", "==", true),
        orderBy("name_sk")
      );

      const listProvidersFn = httpsCallable<any, any[]>(functions, "listBookableProviders");

      const bhRef = collection(db, "business_hours");
      const bhQuery = query(
        bhRef,
        where("business_id", "==", DEMO_BUSINESS_ID),
        orderBy("sort_order")
      );

      const [svcSnap, providerData, bhSnap] = await Promise.all([
        getDocs(servicesQuery),
        listProvidersFn({ business_id: DEMO_BUSINESS_ID }),
        getDocs(bhQuery)
      ]);

      const mappedEmployees: Employee[] = (providerData.data ?? []).map((employee, index) => ({
        id: employee.id,
        name: employee.display_name,
        color: EMPLOYEE_COLOR_ORDER[index % EMPLOYEE_COLOR_ORDER.length],
        isActive: employee.is_active,
        orderIndex: index,
      }));

      const employeeIds = mappedEmployees.map((item) => item.id);

      let schData: any[] = [];
      if (employeeIds.length > 0) {
        const schRef = collection(db, "schedules");
        const schQuery = query(schRef, where("employee_id", "in", employeeIds));
        const schSnap = await getDocs(schQuery);
        schData = schSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const overridesRef = collection(db, "business_date_overrides");
      const overridesQuery = query(overridesRef, where("business_id", "==", DEMO_BUSINESS_ID));
      const overridesSnap = await getDocs(overridesQuery);
      const overrides = overridesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const mappedSchedules: WorkingSchedule[] = schData.map((schedule) => ({
        employeeId: schedule.employee_id,
        weekday: DAY_INDEX[schedule.day_of_week] ?? 0,
        start: schedule.start_time,
        end: schedule.end_time,
        breaks: [],
      }));

      setServices(svcSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOption)));
      setEmployees(mappedEmployees);
      setBusinessHours(bhSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSchedules(mappedSchedules);
      setScheduleRows(schData);
      setDayExceptions(buildDayExceptionsFromBusinessOverrides(overrides as any[], employeeIds));
      setSelectedEmployeeIds((prev) => {
        if (prev.length > 0) {
          return mappedEmployees
            .filter((employee) => prev.includes(employee.id))
            .map((employee) => employee.id);
        }
        return mappedEmployees.map((employee) => employee.id);
      });
    } catch (error) {
      console.error("Error loading static data:", error);
      throw error;
    }
  }, []);

  const getDateRange = useCallback(() => {
    if (view === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return { start: weekStart, end: addDays(weekEnd, 1) };
    }
    if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return { start: weekStart, end: addDays(weekStart, 7) };
    }
    const dayStart = startOfDayInTZ(currentDate, BUSINESS_TZ);
    return { start: dayStart, end: addDays(dayStart, 1) };
  }, [currentDate, view]);

  const loadAppointments = useCallback(async () => {
    const { start, end } = getDateRange();
    const apptsRef = collection(db, "appointments");
    const apptsQuery = query(
      apptsRef,
      where("business_id", "==", DEMO_BUSINESS_ID),
      where("start_at", ">=", start.toISOString()),
      where("start_at", "<", end.toISOString()),
      orderBy("start_at")
    );

    const snap = await getDocs(apptsQuery);
    const mapped = snap.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any))
      .filter(row => row.status !== "cancelled")
      .map(row => mapAppointmentRowToCalendarAppointment(row));

    setAppointments(mapped);
  }, [getDateRange]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStaticData(), loadAppointments()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nepodarilo sa obnoviť kalendár";
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadAppointments, loadStaticData]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const navigate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setCurrentDate((d) => {
        if (view === "month") return addMonths(d, dir);
        if (view === "week") return addWeeks(d, dir);
        return addDays(d, dir);
      });
    },
    [view],
  );

  const goToday = () => {
    setDirection(0);
    setCurrentDate(startOfDayInTZ(new Date(), BUSINESS_TZ));
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > SWIPE_THRESHOLD && dy < 100) navigate(dx < 0 ? 1 : -1);
  };

  const handleTapApt = (apt: CalendarAppointment) => {
    if (apt.type === "blocked") {
      toast.info(`Blokovaný čas: ${getBlockedReason(apt.notes)}`);
      return;
    }
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  const handleSlotTap = (_employeeId: string, time: Date, isBookable: boolean) => {
    if (!isBookable) {
      toast.warning("V tomto čase nie je možné vytvoriť rezerváciu");
      return;
    }
    setSelectedSlotTime(time);
    setBookingOpen(true);
  };

  const handleBookingSubmit = async (data: {
    service_id: string;
    employee_id: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
  }) => {
    try {
      const createBookingFn = httpsCallable<any, any>(functions, "createPublicBooking");
      const result = await createBookingFn({ business_id: DEMO_BUSINESS_ID, ...data });

      if (!result.data.success) {
        throw new Error(result.data.error || "Chyba pri vytváraní rezervácie");
      }

      toast.success("Rezervácia vytvorená!");
      await loadAppointments();
    } catch (error: any) {
      toast.error(error.message || "Chyba pri vytváraní rezervácie");
      throw error;
    }
  };

  const ensureBlockCustomerId = useCallback(async () => {
    if (blockCustomerIdRef.current) return blockCustomerIdRef.current;

    const customersRef = collection(db, "customers");
    const q = query(
      customersRef,
      where("business_id", "==", DEMO_BUSINESS_ID),
      where("email", "==", BLOCK_CUSTOMER_EMAIL)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      blockCustomerIdRef.current = snap.docs[0].id;
      return snap.docs[0].id;
    }

    const created = await addDoc(customersRef, {
      business_id: DEMO_BUSINESS_ID,
      full_name: BLOCK_SERVICE_NAME,
      email: BLOCK_CUSTOMER_EMAIL,
      created_at: new Date().toISOString()
    });

    blockCustomerIdRef.current = created.id;
    return created.id;
  }, []);

  const ensureBlockServiceId = useCallback(async () => {
    if (blockServiceIdRef.current) return blockServiceIdRef.current;

    const servicesRef = collection(db, "services");
    const q = query(
      servicesRef,
      where("business_id", "==", DEMO_BUSINESS_ID),
      where("name_sk", "==", BLOCK_SERVICE_NAME)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      blockServiceIdRef.current = snap.docs[0].id;
      return snap.docs[0].id;
    }

    const created = await addDoc(servicesRef, {
      business_id: DEMO_BUSINESS_ID,
      name_sk: BLOCK_SERVICE_NAME,
      duration_minutes: 30,
      price: 0,
      category: "interné",
      is_active: true,
      created_at: new Date().toISOString()
    });

    blockServiceIdRef.current = created.id;
    return created.id;
  }, []);

  const handleBlockTimeSubmit = async (payload: {
    employee_id: string;
    start_at: string;
    end_at: string;
    reason: string;
  }) => {
    try {
      const [customerId, serviceId] = await Promise.all([
        ensureBlockCustomerId(),
        ensureBlockServiceId(),
      ]);

      const employee = employees.find(e => e.id === payload.employee_id);

      await addDoc(collection(db, "appointments"), {
        business_id: DEMO_BUSINESS_ID,
        customer_id: customerId,
        customer_name: BLOCK_SERVICE_NAME,
        employee_id: payload.employee_id,
        employee_name: employee?.name || "Zamestnanec",
        service_id: serviceId,
        service_name: BLOCK_SERVICE_NAME,
        start_at: payload.start_at,
        end_at: payload.end_at,
        status: "confirmed",
        notes: makeBlockedNote(payload.reason),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast.success("Blokovaný čas uložený");
      await loadAppointments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nepodarilo sa uložiť blokovaný čas";
      toast.error(message);
      throw error;
    }
  };

    const handleCancel = async (id: string) => {
      try {
        await adminUpdateBookingStatus({
          business_id: DEMO_BUSINESS_ID,
          appointment_id: id,
          status: "cancelled",
        });
        toast.success("Rezervácia zrušená");
        setDetailOpen(false);
        await loadAppointments();
    } catch (error: any) {
      toast.error(error.message || "Nepodarilo sa zrušiť rezerváciu");
    }
  };

  const handleMarkArrived = async (id: string) => {
    try {
      await updateDoc(doc(db, "appointments", id), {
        status: "completed",
        updated_at: new Date().toISOString()
      });
      toast.success("Označené ako prišiel");
      setDetailOpen(false);
      await loadAppointments();
    } catch (error: any) {
      toast.error(error.message || "Nepodarilo sa označiť rezerváciu");
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );
  };

  const handleSelectAllEmployees = () => {
    setSelectedEmployeeIds((prev) =>
      prev.length === employees.length ? [] : employees.map((employee) => employee.id),
    );
  };

  const dayEvents: CalendarEvent[] = useMemo(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        employeeId: appointment.employee_id ?? "",
        start: appointment.start_at,
        end: appointment.end_at,
        title: appointment.service_name,
        clientName: appointment.customer_name,
        serviceName: appointment.service_name,
        type:
          appointment.type === "blocked" || isBlockedAppointmentNote(appointment.notes)
            ? "blocked"
            : "reservation",
        status: appointment.status,
      })),
    [appointments],
  );

  const animKey = `${view}-${currentDate.toISOString()}`;

  return (
    <div
      className="cal-shell flex h-[100dvh] flex-col bg-background"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <GlassHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={goToday}
      />

      <EmployeeFilter
        employees={employees}
        selectedEmployeeIds={selectedEmployeeIds}
        onToggle={toggleEmployee}
        onSelectAll={handleSelectAllEmployees}
      />

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        onAddReservation={() => {
          setSelectedSlotTime(new Date());
          setBookingOpen(true);
        }}
        onBlockTime={() => setBlockTimeOpen(true)}
        onRefresh={refreshData}
        onToday={goToday}
        refreshing={refreshing}
      />

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={animKey}
          custom={direction}
          initial={{
            x: direction === 0 ? 0 : direction > 0 ? "40%" : "-40%",
            opacity: 0,
          }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? "-40%" : "40%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
          className="flex-1 min-h-0"
        >
          {view === "month" && (
            <MonthGrid
              currentDate={currentDate}
              appointments={appointments}
              onDayClick={handleDayClick}
              businessHours={businessHours}
              schedules={scheduleRows}
            />
          )}
          {view === "week" && (
            <WeekTimeline
              currentDate={currentDate}
              appointments={appointments}
              timezone={BUSINESS_TZ}
              onDayClick={handleDayClick}
              onTapAppointment={handleTapApt}
            />
          )}
          {view === "day" && (
            <CalendarGrid
              date={currentDate}
              employees={employees}
              selectedEmployeeIds={selectedEmployeeIds}
              events={dayEvents.filter((event) => selectedEmployeeIds.includes(event.employeeId))}
              schedules={schedules}
              dayExceptions={dayExceptions}
              timezone={BUSINESS_TZ}
              onSlotClick={handleSlotTap}
              onEventClick={(event) => {
                const apt = appointments.find((item) => item.id === event.id);
                if (apt) handleTapApt(apt);
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <QuickBookingSheet
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        slotTime={selectedSlotTime}
        services={services}
        employees={employees
          .filter((employee) => selectedEmployeeIds.includes(employee.id))
          .map((employee) => ({ id: employee.id, display_name: employee.name }))}
        onSubmit={handleBookingSubmit}
      />

      <BlockTimeSheet
        open={blockTimeOpen}
        onOpenChange={setBlockTimeOpen}
        date={currentDate}
        employees={employees.map((employee) => ({ id: employee.id, display_name: employee.name }))}
        onSubmit={handleBlockTimeSubmit}
      />

      <AppointmentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        appointment={selectedApt}
        onCancel={handleCancel}
        onMarkArrived={handleMarkArrived}
      />
    </div>
  );
}

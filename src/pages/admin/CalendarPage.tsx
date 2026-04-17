import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { addMinutes, startOfDay, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import { auth, db } from "@/integrations/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  orderBy,
  addDoc,
  updateDoc,
  limit,
  Timestamp
} from "firebase/firestore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BookingCalendar, statusToColor, type BookingCalendarEvent, type BookingCalendarMode, type SlotInfo } from "@/components/booking-calendar";

import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessInfo } from "@/hooks/useBusinessInfo";
import { generateSlots, type BusinessHours, type EmployeeSchedule, type ExistingAppointment } from "@/lib/availability";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, Mail, X, Check, Copy, ExternalLink, Download, Printer, MoreVertical, FilterX, MoveRight, CopyPlus, Lock, Trash2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminUpdateBookingStatus } from "@/integrations/firebase/adminUpdateBookingStatus";
import {
  adminCalendarQuickAction,
  type AdminCalendarRepeatFrequency,
} from "@/integrations/firebase/adminCalendarQuickAction";
import { toCallableErrorMessage } from "@/integrations/firebase/callableError";
import {
  ADMIN_BOOKING_STATUS_LABELS,
  canAdminCancelBooking,
  canAdminCompleteBooking,
  canAdminConfirmBooking,
  canAdminMarkNoShow,
} from "@/lib/adminBookingStatus";
import { buildAdminCalendarCsv, buildAdminCalendarPrintHtml } from "@/lib/adminCalendarExport";
import {
  isBlockedByClientError,
  isIgnorableBlockedFirestoreError,
  warnBlockedByClientOnce,
} from "@/lib/firebaseClientErrors";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  fromCalendarWallClockDateToUtcIso,
  getBusinessDayUtcRange,
  toCalendarWallClockDate,
} from "@/lib/calendarEventUtils";

interface CalEvent {
  id: string; title: string; start: Date; end: Date; status: string; resource: any;
}

interface CustomerHistoryItem {
  id: string;
  start_at: string;
  status: string;
  service_name: string | null;
}

const TOOLBAR_ACTION_START_HOUR = 8;
const TOOLBAR_ACTION_DURATION_MINUTES = 30;
const DEFAULT_BLOCK_REASON = "Blokovaný čas";

const BLOCK_REPEAT_OPTIONS: Array<{
  value: AdminCalendarRepeatFrequency;
  label: string;
}> = [
  { value: "hourly", label: "Každú hodinu" },
  { value: "daily", label: "Každý deň" },
  { value: "weekly", label: "Každý týždeň" },
  { value: "monthly", label: "Každý mesiac" },
  { value: "yearly", label: "Každý rok" },
];

interface BlockDialogState {
  employeeId: string;
  reason: string;
  startDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  repeat: boolean;
  repeatFrequency: AdminCalendarRepeatFrequency;
  repeatUntilDate: string;
}

export default function CalendarPage() {
  const { businessId, isOwnerOrAdmin, activeMembership } = useBusiness();
  const { info: businessInfo, loading: infoLoading } = useBusinessInfo(businessId);
  const business = businessInfo?.business;
  const openingHours = businessInfo?.hours;
  const overrides = businessInfo?.overrides;

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<BookingCalendarMode>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Record<string, EmployeeSchedule[]>>({});
  const [memberships, setMemberships] = useState<{ profile_id: string; role: string }[]>([]);


  const [bookingModal, setBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [bookForm, setBookForm] = useState({ service_id: "", employee_id: "", start_at: "" });
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [customStartTime, setCustomStartTime] = useState("");
  const [saving, setSaving] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Skopírovať");
  const [noteText, setNoteText] = useState("");
  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [compactActionMenu, setCompactActionMenu] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<"move" | "duplicate">("move");
  const [quickActionStartAt, setQuickActionStartAt] = useState("");
  const [quickActionEndAt, setQuickActionEndAt] = useState("");
  const [quickActionEmployeeId, setQuickActionEmployeeId] = useState("");
  const [quickActionSaving, setQuickActionSaving] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogSaving, setBlockDialogSaving] = useState(false);
  const [blockDialogState, setBlockDialogState] = useState<BlockDialogState>({
    employeeId: "",
    reason: DEFAULT_BLOCK_REASON,
    startDate: "",
    startTime: "08:00",
    endTime: "08:30",
    allDay: false,
    repeat: false,
    repeatFrequency: "daily",
    repeatUntilDate: "",
  });
  const eventsRequestRef = useRef(0);
  const copyLabelResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtersStorageKey = `admin-calendar-filters:${businessId}`;
  const calendarTimezone =
    typeof business?.timezone === "string" && business.timezone.trim().length > 0
      ? business.timezone
      : DEFAULT_BUSINESS_TIMEZONE;

  const scheduleCopyLabelReset = useCallback(() => {
    if (copyLabelResetTimeoutRef.current) {
      clearTimeout(copyLabelResetTimeoutRef.current);
    }
    copyLabelResetTimeoutRef.current = setTimeout(() => {
      setCopyLabel("Skopírovať");
      copyLabelResetTimeoutRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (copyLabelResetTimeoutRef.current) {
        clearTimeout(copyLabelResetTimeoutRef.current);
        copyLabelResetTimeoutRef.current = null;
      }
    };
  }, []);

  const loadEvents = useCallback(async () => {
    if (!businessId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const requestId = ++eventsRequestRef.current;
    setLoading(true);
    try {
      let apptsQuery = query(
        collection(db, "appointments"),
        where("business_id", "==", businessId)
      );
      let blocksQuery = query(
        collection(db, "time_blocks"),
        where("business_id", "==", businessId)
      );
      let employeeIdForUser: string | null = null;

      if (!isOwnerOrAdmin) {
        const user = auth.currentUser;
        if (user) {
          // Find employee ID for this user
          const empSnap = await getDocs(query(
            collection(db, "employees"),
            where("business_id", "==", businessId),
            where("profile_id", "==", user.uid),
            limit(1)
          ));

          if (!empSnap.empty) {
            const empId = empSnap.docs[0].id;
            employeeIdForUser = empId;
            apptsQuery = query(apptsQuery, where("employee_id", "==", empId));
            blocksQuery = query(blocksQuery, where("employee_id", "==", empId));
          }
        }
      }

      const [apptsSnap, blocksSnap] = await Promise.all([getDocs(apptsQuery), getDocs(blocksQuery)]);

      const appointmentEvents: CalEvent[] = apptsSnap.docs.map((doc) => {
        const a = doc.data();
        const rawStart =
          a.start_at instanceof Timestamp ? a.start_at.toDate().toISOString() : String(a.start_at ?? "");
        const rawEnd =
          a.end_at instanceof Timestamp ? a.end_at.toDate().toISOString() : String(a.end_at ?? "");
        return {
          id: doc.id,
          title: `${a.customer_name ?? "Zákazník"} – ${a.service_name ?? "Služba"}`,
          start: toCalendarWallClockDate(rawStart, calendarTimezone),
          end: toCalendarWallClockDate(rawEnd, calendarTimezone),
          status: a.status,
          resource: { ...a, id: doc.id },
        };
      });

      const blockedEvents: CalEvent[] = blocksSnap.docs.map((docSnap) => {
        const row = docSnap.data() as Record<string, unknown>;
        const employeeName =
          typeof row.employee_name === "string" ? row.employee_name : null;
        const employeeColor =
          typeof row.employee_color === "string" ? row.employee_color : null;
        const rawStart =
          row.start_at instanceof Timestamp ? row.start_at.toDate().toISOString() : String(row.start_at ?? "");
        const rawEnd =
          row.end_at instanceof Timestamp ? row.end_at.toDate().toISOString() : String(row.end_at ?? "");
        return {
          id: docSnap.id,
          title: `Blok: ${typeof row.reason === "string" ? row.reason : "Blokovaný čas"}`,
          start: toCalendarWallClockDate(rawStart, calendarTimezone),
          end: toCalendarWallClockDate(rawEnd, calendarTimezone),
          status: "blocked",
          resource: {
            ...row,
            id: docSnap.id,
            event_type: "time_block",
            employee_name: employeeName,
            employee_color: employeeColor,
            profile_limited_employee_id: employeeIdForUser,
          },
        };
      });

      if (requestId !== eventsRequestRef.current) return;
      setEvents([...appointmentEvents, ...blockedEvents]);
    } catch (err) {
      if (isIgnorableBlockedFirestoreError(err) || isBlockedByClientError(err)) {
        warnBlockedByClientOnce((message) => toast.warning(message));
        console.warn("CalendarPage: non-critical blocked request", err);
      } else {
        console.error("CalendarPage: error loading events", err);
      }
    } finally {
      if (requestId === eventsRequestRef.current) {
        setLoading(false);
      }
    }
  }, [businessId, calendarTimezone, isOwnerOrAdmin]);


  useEffect(() => {
    if (!businessId) {
      setServices([]);
      setEmployees([]);
      setSchedules({});
      setMemberships([]);
      return;
    }

    let isCancelled = false;

    const loadStaticData = async () => {
      try {
        const [svcSnap, empSnap, memSnap] = await Promise.all([
          getDocs(query(collection(db, "services"), where("business_id", "==", businessId), where("is_active", "==", true))),
          getDocs(query(collection(db, "employees"), where("business_id", "==", businessId), where("is_active", "==", true))),
          getDocs(query(collection(db, "memberships"), where("business_id", "==", businessId)))
        ]);

        if (isCancelled) return;

        setServices(svcSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const emps = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEmployees(emps);
        setMemberships(memSnap.docs.map(d => ({ profile_id: d.data().profile_id, role: d.data().role })));

        const ids = emps.map(e => e.id).slice(0, 10);
        if (!ids.length) {
          setSchedules({});
          return;
        }

        const schedSnap = await getDocs(query(
          collection(db, "schedules"),
          where("employee_id", "in", ids)
        ));

        if (isCancelled) return;
        const map: Record<string, EmployeeSchedule[]> = {};
        schedSnap.forEach((s) => {
          const d = s.data();
          const eid = d.employee_id;
          if (!map[eid]) map[eid] = [];
          map[eid].push({
            day_of_week: d.day_of_week,
            start_time: d.start_time,
            end_time: d.end_time
          });
        });
        setSchedules(map);
      } catch (err) {
        if (isIgnorableBlockedFirestoreError(err) || isBlockedByClientError(err)) {
          warnBlockedByClientOnce((message) => toast.warning(message));
          console.warn("CalendarPage: non-critical blocked static-data request", err);
        } else {
          console.error("CalendarPage: error loading secondary data", err);
        }
      }
    };

    void loadStaticData();
    return () => {
      isCancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(filtersStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { status?: string; employee?: string };
      if (parsed.status) setStatusFilter(parsed.status);
      if (parsed.employee) setEmployeeFilter(parsed.employee);
    } catch {
      // Ignore broken localStorage value
    }
  }, [filtersStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      filtersStorageKey,
      JSON.stringify({ status: statusFilter, employee: employeeFilter })
    );
  }, [employeeFilter, filtersStorageKey, statusFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1024px)");
    const updateCompactState = () => setCompactActionMenu(media.matches);
    updateCompactState();
    media.addEventListener("change", updateCompactState);
    return () => media.removeEventListener("change", updateCompactState);
  }, []);


  const availableEmployees = useMemo(() => {
    let list = employees;
    if (!business?.allow_admin_as_provider) {
      list = list.filter((emp: any) => {
        if (!emp.profile_id) return true;
        const membership = memberships.find((m) => m.profile_id === emp.profile_id);
        if (!membership) return true;
        return membership.role === "employee";
      });
    }
    return list;
  }, [employees, business, memberships]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) {
        return false;
      }
      if (employeeFilter !== "all" && event.resource?.employee_id !== employeeFilter) {
        return false;
      }
      return true;
    });
  }, [employeeFilter, events, statusFilter]);

  const statusOptions = [
    { id: "all", label: "Všetky stavy" },
    { id: "pending", label: "Čakajúce" },
    { id: "confirmed", label: "Potvrdené" },
    { id: "completed", label: "Dokončené" },
    { id: "no_show", label: "No-show" },
    { id: "cancelled", label: "Zrušené" },
  ] as const;

  const visibleResources = useMemo(
    () =>
      isOwnerOrAdmin
        ? availableEmployees.filter((employee: any) => employeeFilter === "all" || employee.id === employeeFilter)
        : availableEmployees.filter((employee: any) => employee.profile_id === activeMembership?.profile_id),
    [activeMembership?.profile_id, availableEmployees, employeeFilter, isOwnerOrAdmin],
  );

  const actionableEmployees = useMemo(
    () => (visibleResources.length > 0 ? visibleResources : availableEmployees),
    [availableEmployees, visibleResources],
  );

  const actionableEmployeeIds = useMemo(
    () => new Set(actionableEmployees.map((employee: any) => employee.id)),
    [actionableEmployees],
  );


  const loadAvailableSlots = useCallback(async (slotDate: Date, employeeId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !employeeId || !business) return;

    const { startUtc, endUtc } = getBusinessDayUtcRange(slotDate, calendarTimezone);

    try {
      const apptsSnap = await getDocs(query(
        collection(db, "appointments"),
        where("employee_id", "==", employeeId),
        where("start_at", ">=", startUtc),
        where("start_at", "<", endUtc)
      ));

      const existing: ExistingAppointment[] = apptsSnap.docs
        .map((d) => d.data())
        .filter((appointment) => appointment.status !== "cancelled")
        .map((appointment) => ({
          start_at:
            toCalendarWallClockDate(
              appointment.start_at instanceof Timestamp
                ? appointment.start_at.toDate().toISOString()
                : String(appointment.start_at ?? ""),
              calendarTimezone,
            ).toISOString(),
          end_at:
            toCalendarWallClockDate(
              appointment.end_at instanceof Timestamp
                ? appointment.end_at.toDate().toISOString()
                : String(appointment.end_at ?? ""),
              calendarTimezone,
            ).toISOString(),
        }));

      const slots = generateSlots({
        date: slotDate,
        serviceDuration: service.duration_minutes,
        serviceBuffer: service.buffer_minutes ?? 0,
        openingHours: (business.opening_hours ?? {}) as BusinessHours,
        employeeSchedules: schedules[employeeId] ?? [],
        existingAppointments: existing,
        leadTimeMinutes: 0,
        slotInterval: 15,
      });

      setAvailableSlots(slots);
    } catch (err) {
      console.error("Error loading slots:", err);
    }
  }, [calendarTimezone, services, business, schedules]);

  useEffect(() => {
    if (bookForm.service_id && bookForm.employee_id && selectedSlot) {
      loadAvailableSlots(selectedSlot.start, bookForm.employee_id, bookForm.service_id);
    }
  }, [bookForm.service_id, bookForm.employee_id, selectedSlot, loadAvailableSlots]);

  const handleCustomTimeChange = (value: string) => {
    setCustomStartTime(value);
    if (!selectedSlot || !value) return;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
    const preciseStart = new Date(selectedSlot.start);
    preciseStart.setHours(hours, minutes, 0, 0);
    setBookForm((current) => ({ ...current, start_at: preciseStart.toISOString() }));
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    if (slot.intent === "block") {
      openBlockDialog({
        start: slot.start,
        end: slot.end,
        employeeId: slot.resourceId,
      });
      return;
    }

    setSelectedSlot(slot);
    setCustomStartTime(fmtDate(slot.start, "HH:mm"));
    setBookForm({
      service_id: "",
      employee_id:
        typeof slot.resourceId === "string" && actionableEmployeeIds.has(slot.resourceId)
          ? slot.resourceId
          : "",
      start_at: slot.start.toISOString()
    });
    setAvailableSlots([]);
    setBookingModal(true);
  };

  const handleSelectEvent = (event: BookingCalendarEvent) => {
    const res = event.resource as { status?: string } | undefined;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      status: res?.status ?? "pending",
      resource: event.resource,
    });
    setNoteText(typeof (event.resource as any)?.note === "string" ? (event.resource as any).note : "");
    setDetailModal(true);
  };

  const toInputDateTimeLocal = (input: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${input.getFullYear()}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}T${pad(input.getHours())}:${pad(input.getMinutes())}`;
  };

  const toInputDate = (input: Date) => fmtDate(input, "yyyy-MM-dd");
  const toInputTime = (input: Date) => fmtDate(input, "HH:mm");

  const mergeLocalDateAndTime = useCallback((dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) return null;
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hours, minutes] = timeValue.split(":").map(Number);

    if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) {
      return null;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }, []);

  const openBlockDialog = useCallback(
    (params: {
      start: Date;
      end: Date;
      employeeId?: string;
      reason?: string;
      allDay?: boolean;
    }) => {
      const fallbackEmployeeId =
        params.employeeId ||
        actionableEmployees[0]?.id ||
        visibleResources[0]?.id ||
        availableEmployees[0]?.id ||
        "";

      if (!fallbackEmployeeId) {
        toast.error("Nie je dostupný žiadny zamestnanec pre blokáciu.");
        return;
      }

      setBlockDialogState({
        employeeId: fallbackEmployeeId,
        reason: params.reason?.trim() || DEFAULT_BLOCK_REASON,
        startDate: toInputDate(params.start),
        startTime: toInputTime(params.start),
        endTime: toInputTime(params.end),
        allDay: params.allDay === true,
        repeat: false,
        repeatFrequency: "daily",
        repeatUntilDate: toInputDate(params.start),
      });
      setBlockDialogOpen(true);
    },
    [actionableEmployees, availableEmployees, visibleResources],
  );

  const buildToolbarActionSlot = useCallback((baseDate: Date) => {
    const start = startOfDay(baseDate);
    start.setHours(TOOLBAR_ACTION_START_HOUR, 0, 0, 0);
    const end = addMinutes(start, TOOLBAR_ACTION_DURATION_MINUTES);
    return { start, end };
  }, []);

  const handleToolbarCreateBooking = useCallback(() => {
    const slot = buildToolbarActionSlot(date);
    handleSelectSlot(slot);
  }, [buildToolbarActionSlot, date]);

  const handleToolbarBlock = useCallback(() => {
    const slot = buildToolbarActionSlot(date);
    openBlockDialog({ start: slot.start, end: slot.end });
  }, [buildToolbarActionSlot, date, openBlockDialog]);

  const openQuickAction = (action: "move" | "duplicate") => {
    if (!selectedEvent) return;
    const employeeId =
      typeof selectedEvent.resource?.employee_id === "string" ? selectedEvent.resource.employee_id : "";
    const startAt = toInputDateTimeLocal(selectedEvent.start);
    const endAt = toInputDateTimeLocal(selectedEvent.end);

    setQuickActionType(action);
    setQuickActionEmployeeId(employeeId);
    setQuickActionStartAt(startAt);
    setQuickActionEndAt(endAt);
    setQuickActionOpen(true);
  };

  useEffect(() => {
    const loadCustomerHistory = async () => {
      if (!detailModal || !selectedEvent?.resource?.customer_id) {
        setCustomerHistory([]);
        setLoadingHistory(false);
        return;
      }

      setLoadingHistory(true);
      try {
        const historySnap = await getDocs(query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
          where("customer_id", "==", selectedEvent.resource.customer_id),
          orderBy("start_at", "desc"),
          limit(6)
        ));

        setCustomerHistory(historySnap.docs.map((docSnap) => {
          const item = docSnap.data() as {
            start_at?: string;
            status?: string;
            service_name?: string | null;
          };

          return {
            id: docSnap.id,
            start_at: item.start_at ?? "",
            status: item.status ?? "pending",
            service_name: item.service_name ?? null,
          };
        }));
      } catch (error) {
        if (isIgnorableBlockedFirestoreError(error) || isBlockedByClientError(error)) {
          warnBlockedByClientOnce((message) => toast.warning(message));
          console.warn("CalendarPage: non-critical blocked history request", error);
        } else {
          console.error("CalendarPage: error loading customer history", error);
        }
        setCustomerHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    void loadCustomerHistory();
  }, [businessId, detailModal, selectedEvent]);

  const bookingCalendarEvents: BookingCalendarEvent[] = useMemo(
    () =>
      filteredEvents.map((e) => {
        const employeeColor = (e.resource as any)?.employee_color;
        return {
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          color: employeeColor || statusToColor(e.status),
          resource: e.resource,
        };
      }),
    [filteredEvents],
  );

  const selectedDayEvents = useMemo(
    () =>
      filteredEvents
        .filter((event) => fmtDate(event.start, "yyyy-MM-dd") === fmtDate(date, "yyyy-MM-dd"))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [date, filteredEvents],
  );

  const canManageSelectedEvent = useMemo(() => {
    if (!selectedEvent) return false;
    if (isOwnerOrAdmin) return true;
    const employeeId =
      typeof selectedEvent.resource?.employee_id === "string" ? selectedEvent.resource.employee_id : null;
    return employeeId ? actionableEmployeeIds.has(employeeId) : false;
  }, [actionableEmployeeIds, isOwnerOrAdmin, selectedEvent]);

  const exportRows = useMemo(
    () =>
      selectedDayEvents.map((event) => ({
        reference: event.id,
        customerName: event.resource?.customer_name ?? event.title,
        customerEmail: event.resource?.customer_email ?? null,
        customerPhone: event.resource?.customer_phone ?? null,
        serviceName: event.resource?.service_name ?? null,
        employeeName: event.resource?.employee_name ?? null,
        start: event.start,
        end: event.end,
        status: ADMIN_BOOKING_STATUS_LABELS[event.status as keyof typeof ADMIN_BOOKING_STATUS_LABELS] ?? event.status,
        note: typeof event.resource?.note === "string" ? event.resource.note : null,
      })),
    [selectedDayEvents],
  );

  const handleExportCsv = useCallback(() => {
    const csv = buildAdminCalendarCsv(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kalendar-${fmtDate(date, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [date, exportRows]);

  const handlePrintDay = useCallback(() => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!printWindow) {
      toast.error("Nepodarilo sa otvoriť tlačové okno");
      return;
    }

    const html = buildAdminCalendarPrintHtml(
      fmtDate(date, "EEEE, d. MMMM yyyy", { locale: sk }),
      exportRows
    );
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [date, exportRows]);

  const handleJumpToday = useCallback(() => {
    const now = new Date();
    setDate(now);
    setView("day");
  }, []);


  const handleBook = async () => {
    if (!bookForm.service_id || !bookForm.employee_id || !bookForm.start_at) { toast.error("Vyplňte všetky polia"); return; }

    const selectedIso = new Date(bookForm.start_at).toISOString();
    const isExactAvailable = availableSlots.some((slot) => slot.toISOString() === selectedIso);
    if (availableSlots.length > 0 && !isExactAvailable) {
      toast.error("Zvolený čas nie je dostupný. Vyberte prosím čas zo slotov.");
      return;
    }

    setSaving(true);
    try {
      const service = services.find((s) => s.id === bookForm.service_id);
      const employee = employees.find((e) => e.id === bookForm.employee_id);
      const duration = (service?.duration_minutes ?? 30) + (service?.buffer_minutes ?? 0);
      const start = new Date(bookForm.start_at);
      const end = addMinutes(start, duration);
      const startAtUtc = fromCalendarWallClockDateToUtcIso(start, calendarTimezone);
      const endAtUtc = fromCalendarWallClockDateToUtcIso(end, calendarTimezone);

      const walkinEmail = `walkin-${Date.now()}@internal`;

      // Simplified walk-in creation: add a guest user or use denormalized info
      await addDoc(collection(db, "appointments"), {
        business_id: businessId,
        customer_name: "Zákazník (osobne)",
        customer_email: walkinEmail,
        employee_id: bookForm.employee_id,
        employee_name: employee?.display_name ?? "?",
        employee_color: employee?.color ?? null,
        service_id: bookForm.service_id,
        service_name: service?.name_sk ?? "?",
        start_at: startAtUtc,
        end_at: endAtUtc,
        status: "confirmed",
        created_at: new Date().toISOString()
      });

      toast.success("Rezervácia vytvorená");
      setBookingModal(false);
      loadEvents();
    } catch (err) {
      console.error("handleBook error:", err);
      toast.error("Chyba pri vytváraní rezervácie");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: "pending" | "confirmed" | "cancelled" | "completed" | "no_show") => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      const result = await adminUpdateBookingStatus({
        business_id: businessId,
        appointment_id: selectedEvent.id,
        status: newStatus,
      });
      setSelectedEvent((current) => current ? {
        ...current,
        status: result.status,
        resource: {
          ...current.resource,
          status: result.status,
        },
      } : current);
      toast.success("Status aktualizovaný");
      await loadEvents();
    } catch (err) {
      console.error("handleStatusChange error:", err);
      toast.error("Chyba pri aktualizácii");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), {
        note: noteText || null,
        updated_at: new Date().toISOString(),
      });
      setSelectedEvent((current) => current ? {
        ...current,
        resource: {
          ...current.resource,
          note: noteText || null,
        },
      } : current);
      toast.success("Poznámka uložená");
    } catch (err) {
      console.error("handleSaveNote error:", err);
      toast.error("Chyba pri ukladaní poznámky");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const blockDialogValidationError = useMemo(() => {
    if (!blockDialogState.employeeId) {
      return "Vyberte pracovníka.";
    }
    if (!blockDialogState.reason.trim()) {
      return "Zadajte názov blokácie.";
    }
    if (!blockDialogState.startDate) {
      return "Vyberte dátum blokácie.";
    }
    if (blockDialogState.repeat && !blockDialogState.repeatUntilDate) {
      return "Vyberte dátum ukončenia opakovania.";
    }
    if (blockDialogState.repeat && blockDialogState.repeatUntilDate < blockDialogState.startDate) {
      return "Opakovanie nemôže končiť pred prvým dňom blokácie.";
    }
    if (blockDialogState.allDay) {
      return null;
    }

    const start = mergeLocalDateAndTime(blockDialogState.startDate, blockDialogState.startTime);
    const end = mergeLocalDateAndTime(blockDialogState.startDate, blockDialogState.endTime);
    if (!start || !end) {
      return "Vyplňte platný čas od aj do.";
    }
    if (end <= start) {
      return "Čas do musí byť neskôr ako čas od.";
    }

    return null;
  }, [blockDialogState, mergeLocalDateAndTime]);

  const handleCreateBlock = async () => {
    if (blockDialogValidationError) {
      toast.error(blockDialogValidationError);
      return;
    }

    let startAtUtc: string;
    let endAtUtc: string;

    if (blockDialogState.allDay) {
      const blockDate = mergeLocalDateAndTime(blockDialogState.startDate, "00:00");
      if (!blockDate) {
        toast.error("Neplatný dátum blokácie.");
        return;
      }
      const dayRange = getBusinessDayUtcRange(blockDate, calendarTimezone);
      startAtUtc = dayRange.startUtc;
      endAtUtc = dayRange.endUtc;
    } else {
      const start = mergeLocalDateAndTime(blockDialogState.startDate, blockDialogState.startTime);
      const end = mergeLocalDateAndTime(blockDialogState.startDate, blockDialogState.endTime);
      if (!start || !end) {
        toast.error("Vyplňte platný čas od aj do.");
        return;
      }
      startAtUtc = fromCalendarWallClockDateToUtcIso(start, calendarTimezone);
      endAtUtc = fromCalendarWallClockDateToUtcIso(end, calendarTimezone);
    }

    setBlockDialogSaving(true);
    try {
      await adminCalendarQuickAction({
        business_id: businessId,
        action: "block",
        employee_id: blockDialogState.employeeId,
        start_at: startAtUtc,
        end_at: endAtUtc,
        reason: blockDialogState.reason.trim(),
        all_day: blockDialogState.allDay,
        repeat: blockDialogState.repeat,
        repeat_frequency: blockDialogState.repeat ? blockDialogState.repeatFrequency : undefined,
        repeat_until_date: blockDialogState.repeat ? blockDialogState.repeatUntilDate : undefined,
        timezone: calendarTimezone,
      });
      toast.success("Blokovaný čas bol uložený");
      setBlockDialogOpen(false);
      setDetailModal(false);
      await loadEvents();
    } catch (error) {
      console.error("CalendarPage: create block failed", error);
      toast.error(toCallableErrorMessage(error, "Nepodarilo sa uložiť blokáciu"));
    } finally {
      setBlockDialogSaving(false);
    }
  };

  const handleRunQuickAction = async () => {
    if (!selectedEvent) return;
    if (!quickActionStartAt || !quickActionEndAt) {
      toast.error("Vyberte čas od aj do.");
      return;
    }

    const eventType =
      selectedEvent?.resource?.event_type === "time_block" ? "time_block" : "appointment";
    const payload: Record<string, unknown> = {
      business_id: businessId,
      action: quickActionType,
      start_at: fromCalendarWallClockDateToUtcIso(new Date(quickActionStartAt), calendarTimezone),
      end_at: fromCalendarWallClockDateToUtcIso(new Date(quickActionEndAt), calendarTimezone),
      employee_id: quickActionEmployeeId || selectedEvent?.resource?.employee_id,
    };

    payload.event_type = eventType;
    if (eventType === "time_block") {
      payload.time_block_id = selectedEvent.id;
    } else {
      payload.appointment_id = selectedEvent.id;
    }

    setQuickActionSaving(true);
    try {
      await adminCalendarQuickAction(payload as any);
      toast.success("Akcia bola uložená");
      setQuickActionOpen(false);
      setDetailModal(false);
      await loadEvents();
    } catch (error) {
      console.error("CalendarPage: quick action failed", error);
      toast.error(toCallableErrorMessage(error, "Nepodarilo sa vykonať akciu"));
    } finally {
      setQuickActionSaving(false);
    }
  };

  const handleDeleteBlock = async () => {
    if (!selectedEvent || selectedEvent.resource?.event_type !== "time_block") return;
    setQuickActionSaving(true);
    try {
      await adminCalendarQuickAction({
        business_id: businessId,
        action: "delete_block",
        event_type: "time_block",
        time_block_id: selectedEvent.id,
      });
      toast.success("Blokovaný čas bol odstránený");
      setDetailModal(false);
      await loadEvents();
    } catch (error) {
      console.error("CalendarPage: delete block failed", error);
      toast.error(toCallableErrorMessage(error, "Nepodarilo sa odstrániť blokovaný čas"));
    } finally {
      setQuickActionSaving(false);
    }
  };


  return (
    <div className="space-y-4 h-full max-w-full overflow-x-hidden calendar-page-root">
      <AdminPageHeader
        title="Kalendár"
        description="Prehľad rezervácií, blokácií a rýchlych akcií pre celý tím."
      />

      <div className="rounded-xl border border-border bg-card/40 p-1 md:p-2 flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SidebarTrigger className="h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-9 md:min-w-9 flex items-center justify-center shrink-0 border border-border bg-background hover:bg-accent" />
            
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar flex-1 max-w-full">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 min-h-[44px] w-[140px] md:w-[160px] shrink-0 bg-background/50">
                  <SelectValue placeholder="Všetky stavy" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((statusOption) => (
                    <SelectItem key={statusOption.id} value={statusOption.id}>
                      {statusOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="h-9 min-h-[44px] w-[140px] md:w-[160px] shrink-0 bg-background/50">
                  <SelectValue placeholder="Všetci" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetci zamestnanci</SelectItem>
                  {availableEmployees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 min-h-[44px] min-w-[44px] shrink-0 bg-background/50"
                onClick={() => {
                  setStatusFilter("all");
                  setEmployeeFilter("all");
                }}
                title="Resetovať filtre"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-1" />}
            <div className="hidden sm:block"><ThemeToggle /></div>
            
            {compactActionMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px]" aria-label="Export a tlač">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCsv} disabled={exportRows.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrintDay} disabled={exportRows.length === 0}>
                    <Printer className="mr-2 h-4 w-4" /> PDF / Tlač
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" className="h-8 md:h-9" onClick={handleExportCsv} disabled={exportRows.length === 0}>
                  <Download className="md:mr-2 h-4 w-4" />
                  <span className="hidden md:inline">CSV</span>
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 md:h-9" onClick={handlePrintDay} disabled={exportRows.length === 0}>
                  <Printer className="md:mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Tlač</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="bg-card rounded-xl border border-border p-1.5 sm:p-4 pb-24 md:pb-4 flex flex-col min-h-0 max-w-full overflow-x-hidden calendar-page-shell"
        style={{ ["--calendar-shell-offset" as string]: compactActionMenu ? "60px" : "90px" }}
      >
        <BookingCalendar
          events={bookingCalendarEvents}
          date={date}
          setDate={setDate}
          mode={view}
          setMode={setView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={isOwnerOrAdmin}
          businessHours={{ hours: openingHours, overrides }}
          resources={visibleResources}
          headerActions={(
            <div
              className="flex w-full flex-wrap items-stretch justify-end gap-2 rounded-2xl border border-white/8 bg-background/55 p-1.5 shadow-sm"
              data-testid="calendar-header-actions"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-[42px] min-w-0 flex-1 border-white/10 bg-background/75 sm:flex-none"
                onClick={handleJumpToday}
              >
                Dnes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-[42px] min-w-0 flex-1 border-white/10 bg-background/75 sm:flex-none"
                onClick={handleToolbarBlock}
              >
                Blokácia
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-h-[42px] min-w-0 flex-1 bg-gold text-gold-foreground shadow-[0_12px_28px_rgba(201,168,76,0.2)] hover:bg-gold/90 sm:flex-none"
                onClick={handleToolbarCreateBooking}
              >
                Nová rezervácia
              </Button>
            </div>
          )}
        />
      </div>

      {/* Booking Modal */}
      <Dialog open={bookingModal} onOpenChange={setBookingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nová rezervácia</DialogTitle>
            <DialogDescription>
              Vyberte službu, zamestnanca a čas rezervácie. Presný čas môžete nastaviť aj manuálne.
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <p className="text-sm font-medium text-primary">
              {fmtDate(selectedSlot.start, "EEEE, d. MMMM yyyy HH:mm", { locale: sk })}
            </p>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Služba</Label>
              <Select
                value={bookForm.service_id}
                onValueChange={(v) =>
                  setBookForm((f) => ({
                    ...f,
                    service_id: v,
                    start_at: f.start_at || selectedSlot?.start.toISOString() || "",
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Vyberte službu" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_sk} ({s.duration_minutes} min{s.price ? `, ${s.price}€` : ""})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zamestnanec</Label>
              <Select
                value={bookForm.employee_id}
                onValueChange={(v) =>
                  setBookForm((f) => ({
                    ...f,
                    employee_id: v,
                    start_at: f.start_at || selectedSlot?.start.toISOString() || "",
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Vyberte zamestnanca" /></SelectTrigger>
                <SelectContent>{actionableEmployees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedSlot && (
              <div className="space-y-1.5">
                <Label>Presný čas</Label>
                <Input
                  type="time"
                  step={300}
                  value={customStartTime}
                  onChange={(event) => handleCustomTimeChange(event.target.value)}
                />
              </div>
            )}
            {availableSlots.length > 0 && (
              <div className="space-y-1.5">
                <Label>Dostupné sloty (15 min)</Label>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {availableSlots.map((slot) => {
                    const iso = slot.toISOString();
                    return (
                      <button
                        key={iso}
                        onClick={() => {
                          setBookForm((f) => ({ ...f, start_at: iso }));
                          setCustomStartTime(fmtDate(slot, "HH:mm"));
                        }}
                        className={`text-xs py-1.5 rounded-md border transition-colors font-medium ${bookForm.start_at === iso ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-accent"}`}>
                        {fmtDate(slot, "HH:mm")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {bookForm.service_id && bookForm.employee_id && availableSlots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Žiadne dostupné termíny</p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setBookingModal(false)} className="flex-1">Zrušiť</Button>
            <Button onClick={handleBook} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Vytvoriť rezerváciu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={detailModal} onOpenChange={setDetailModal}>
        <SheetContent side="right" className="w-full border-l border-[#C0C0C0]/12 bg-black px-0 py-0 sm:max-w-md flex flex-col overflow-hidden [&>button]:text-white/40 [&>button]:hover:text-[#D4AF37]">
          <SheetHeader className="sr-only">
            <SheetTitle>Detail rezervácie</SheetTitle>
            <SheetDescription>Detaily vybranej rezervácie</SheetDescription>
          </SheetHeader>
          {selectedEvent && (
            <>
              {/* ── Header ── */}
              <div className="px-5 pt-5 pb-4 border-b border-[#C0C0C0]/12 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/30 mb-1">Detail rezervácie</p>
                    <h2 className="text-base font-bold text-white truncate">
                      {selectedEvent.resource?.customer_name ?? selectedEvent.title}
                    </h2>
                    <p className="text-xs text-white/40 mt-0.5 truncate">
                      {selectedEvent.resource?.service_name ?? "Služba"}
                    </p>
                  </div>
                  {(() => {
                    const sc: Record<string, { label: string; cls: string }> = {
                      confirmed: { label: "Potvrdená", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25 shadow-[0_0_10px_rgba(52,211,153,0.25)]" },
                      pending:   { label: "Čakajúca",  cls: "text-amber-400  bg-amber-500/10  border-amber-500/25  shadow-[0_0_10px_rgba(251,191,36,0.25)]"  },
                      cancelled: { label: "Zrušená",   cls: "text-red-400    bg-red-500/10    border-red-500/25    shadow-[0_0_10px_rgba(248,113,113,0.25)]" },
                      completed: { label: "Dokončená", cls: "text-white/40   bg-white/5       border-white/10" },
                      no_show:   { label: "No-show",   cls: "text-orange-400 bg-orange-500/10 border-orange-500/25 shadow-[0_0_10px_rgba(251,146,60,0.25)]"  },
                    };
                    const s = sc[selectedEvent.status] ?? sc.pending;
                    return (
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${s.cls}`}>
                        {s.label}
                      </span>
                    );
                  })()}
                </div>
                {/* REF row */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/25">Ref</span>
                  <span className="font-mono text-[10px] text-white/40 truncate flex-1 min-w-0">{selectedEvent.id}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(selectedEvent.id); setCopyLabel("Skopírované"); } catch { setCopyLabel("Kópia zlyhala"); }
                      scheduleCopyLabelReset();
                    }}
                    className="shrink-0 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-white/35 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors"
                  >
                    <Copy className="w-2.5 h-2.5" /> {copyLabel}
                  </button>
                  <a
                    href={`/dashboard/history?ref=${encodeURIComponent(selectedEvent.id)}`}
                    className="shrink-0 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-[#D4AF37]/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors"
                  >
                    <ExternalLink className="w-2.5 h-2.5" /> História
                  </a>
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

                {/* Client info grid */}
                <div className="rounded-xl border border-[#C0C0C0]/18 bg-white/[0.02] p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1.5">Meno</p>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                      <User className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      <span className="truncate">{selectedEvent.resource?.customer_name ?? selectedEvent.title}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1.5">Telefón</p>
                    <div className="flex items-center gap-1.5 text-sm text-white">
                      <Phone className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      <span>{selectedEvent.resource?.customer_phone ?? "—"}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1.5">E-mail</p>
                    <div className="flex items-center gap-1.5 text-sm text-white">
                      <Mail className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      <span className="break-all">{selectedEvent.resource?.customer_email ?? "—"}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1.5">Termín</p>
                    <div className="flex items-center gap-1.5 text-sm text-white">
                      <Clock className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      <span>{fmtDate(selectedEvent.start, "d. M. yyyy HH:mm")} – {fmtDate(selectedEvent.end, "HH:mm")}</span>
                    </div>
                  </div>
                </div>

                {/* Service badge */}
                <div className="rounded-xl border border-[#C0C0C0]/18 bg-white/[0.02] px-4 py-3 flex items-center gap-3">
                  <LogoIcon size="sm" className="w-7 h-7 shrink-0 opacity-60" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {selectedEvent.resource?.service_name ?? selectedEvent.title}
                    </p>
                    <p className="text-xs text-white/35 truncate">{selectedEvent.resource?.employee_name ?? ""}</p>
                  </div>
                </div>

                {/* Secondary icon actions */}
                {canManageSelectedEvent && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { action: "move",      Icon: MoveRight, label: "Presunúť"   },
                      { action: "duplicate", Icon: CopyPlus,  label: "Duplikovať" },
                      { action: "block",     Icon: Lock,      label: "Blokovať"   },
                    ].map(({ action, Icon, label }) => (
                      <button
                        key={action}
                        onClick={() => {
                          if (action === "block") {
                            openBlockDialog({
                              start: selectedEvent.start,
                              end: selectedEvent.end,
                              employeeId:
                                typeof selectedEvent.resource?.employee_id === "string"
                                  ? selectedEvent.resource.employee_id
                                  : "",
                              reason:
                                typeof selectedEvent.resource?.reason === "string"
                                  ? selectedEvent.resource.reason
                                  : DEFAULT_BLOCK_REASON,
                              allDay: selectedEvent.resource?.all_day === true,
                            });
                            return;
                          }
                          openQuickAction(action as "move" | "duplicate");
                        }}
                        disabled={updatingStatus || quickActionSaving || blockDialogSaving}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#C0C0C0]/18 bg-white/[0.02] py-3 text-white/50 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all disabled:opacity-30"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {canManageSelectedEvent && selectedEvent.resource?.event_type === "time_block" && (
                  <button
                    onClick={handleDeleteBlock}
                    disabled={quickActionSaving || blockDialogSaving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> Odstrániť blok
                  </button>
                )}

                {/* History — compact scrollable */}
                <div className="rounded-xl border border-[#C0C0C0]/18 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/30">História klienta</p>
                    <a
                      href={`/dashboard/history?ref=${encodeURIComponent(selectedEvent.id)}`}
                      className="text-[9px] font-semibold text-[#D4AF37]/60 hover:text-[#D4AF37] flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Všetky
                    </a>
                  </div>
                  {loadingHistory ? (
                    <p className="text-xs text-white/25 py-1">Načítava sa…</p>
                  ) : customerHistory.length === 0 ? (
                    <p className="text-xs text-white/25 py-1">Žiadne záznamy</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                      {customerHistory.map((hi) => {
                        const dot: Record<string, string> = {
                          confirmed: "bg-emerald-400", completed: "bg-white/25",
                          cancelled: "bg-red-400", pending: "bg-amber-400", no_show: "bg-orange-400",
                        };
                        return (
                          <div key={hi.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[hi.status] ?? "bg-white/20"}`} />
                            <span className="flex-1 min-w-0 truncate text-xs text-white/65">{hi.service_name ?? "Služba"}</span>
                            <span className="shrink-0 text-[10px] text-white/25">{hi.start_at ? fmtDate(new Date(hi.start_at), "d. M. yyyy") : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-[9px] text-white/20">{!loadingHistory && `${customerHistory.length} rezervácií`}</p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/30">Poznámka</p>
                  <textarea
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#D4AF37]/40 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)] transition-all resize-none"
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Interná poznámka k rezervácii…"
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="border-t border-[#C0C0C0]/12 px-5 py-4 space-y-2.5 shrink-0 bg-black">
                {isOwnerOrAdmin && (
                  <div className="grid gap-2 grid-cols-2">
                    {canAdminConfirmBooking(selectedEvent.status) && (
                      <button onClick={() => handleStatusChange("confirmed")} disabled={updatingStatus}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/12 border border-emerald-500/22 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/22 transition-all disabled:opacity-40">
                        <Check className="h-3.5 w-3.5" /> Potvrdiť
                      </button>
                    )}
                    {canAdminCompleteBooking(selectedEvent.status) && (
                      <button onClick={() => handleStatusChange("completed")} disabled={updatingStatus}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-white/6 border border-white/10 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 transition-all disabled:opacity-40">
                        <Check className="h-3.5 w-3.5" /> Dokončiť
                      </button>
                    )}
                    {canAdminMarkNoShow(selectedEvent.status) && (
                      <button onClick={() => handleStatusChange("no_show")} disabled={updatingStatus}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 py-2.5 text-sm font-semibold text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-40">
                        <X className="h-3.5 w-3.5" /> No-show
                      </button>
                    )}
                    {canAdminCancelBooking(selectedEvent.status) && (
                      <button onClick={() => handleStatusChange("cancelled")} disabled={updatingStatus}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/8 border border-rose-500/18 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/16 transition-all disabled:opacity-40">
                        <X className="h-3.5 w-3.5" /> Zrušiť
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={handleSaveNote}
                  disabled={updatingStatus}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/18 bg-[#D4AF37]/6 py-2.5 text-sm font-semibold text-[#D4AF37]/70 hover:bg-[#D4AF37]/12 hover:text-[#D4AF37] transition-all disabled:opacity-40"
                >
                  {updatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                  Uložiť poznámku
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={quickActionOpen} onOpenChange={setQuickActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickActionType === "move" && "Presun termínu"}
              {quickActionType === "duplicate" && "Duplikácia termínu"}
            </DialogTitle>
            <DialogDescription>
              Vyberte cieľový čas a zamestnanca. Systém automaticky overí kolízie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Zamestnanec</Label>
              <Select value={quickActionEmployeeId} onValueChange={setQuickActionEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Vyberte zamestnanca" /></SelectTrigger>
                <SelectContent>
                  {actionableEmployees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id}>{employee.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Od</Label>
              <Input type="datetime-local" step={900} value={quickActionStartAt} onChange={(event) => setQuickActionStartAt(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Do</Label>
              <Input type="datetime-local" step={900} value={quickActionEndAt} onChange={(event) => setQuickActionEndAt(event.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setQuickActionOpen(false)}>Zrušiť</Button>
            <Button className="flex-1" onClick={handleRunQuickAction} disabled={quickActionSaving}>
              {quickActionSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložiť
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-[30px] border-border/70 bg-background/95 p-0 shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:max-w-lg">
          <DialogHeader className="border-b border-gold/20 bg-[linear-gradient(180deg,rgba(201,168,76,0.18),rgba(201,168,76,0.06))] px-6 py-5 text-left">
            <DialogTitle className="text-2xl font-black tracking-tight">Pridať blokovaný čas</DialogTitle>
            <DialogDescription className="max-w-md text-sm text-muted-foreground">
              Zablokujte konkrétny čas alebo vytvorte opakovanú sériu. Kolízie sa overia ešte pred uložením.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="space-y-1.5">
              <Label htmlFor="block-reason">Názov blokovania</Label>
              <Input
                id="block-reason"
                value={blockDialogState.reason}
                onChange={(event) =>
                  setBlockDialogState((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Pauza / Dovolenka / Interné školenie"
              />
              <p className="text-xs text-muted-foreground">
                Tento názov sa zobrazí priamo v kalendári ako popis blokácie.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-1.5">
                <Label>Vyberte pracovníka / položku</Label>
                <Select
                  value={blockDialogState.employeeId}
                  onValueChange={(value) =>
                    setBlockDialogState((current) => ({ ...current, employeeId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte pracovníka" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionableEmployees.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="block-date">Dátum od</Label>
                <Input
                  id="block-date"
                  type="date"
                  value={blockDialogState.startDate}
                  onChange={(event) =>
                    setBlockDialogState((current) => ({
                      ...current,
                      startDate: event.target.value,
                      repeatUntilDate:
                        current.repeat && current.repeatUntilDate < event.target.value
                          ? event.target.value
                          : current.repeatUntilDate,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="block-repeat" className="text-sm font-medium">
                    Opakovať blokáciu
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Vytvorí sériu blokácií s rovnakým nastavením až do zvoleného dátumu.
                  </p>
                </div>
                <Checkbox
                  id="block-repeat"
                  checked={blockDialogState.repeat}
                  onCheckedChange={(checked) =>
                    setBlockDialogState((current) => ({
                      ...current,
                      repeat: checked === true,
                      repeatUntilDate: checked === true ? current.repeatUntilDate || current.startDate : current.startDate,
                    }))
                  }
                />
              </div>

              {blockDialogState.repeat && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Opakovanie</Label>
                    <Select
                      value={blockDialogState.repeatFrequency}
                      onValueChange={(value) =>
                        setBlockDialogState((current) => ({
                          ...current,
                          repeatFrequency: value as AdminCalendarRepeatFrequency,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte frekvenciu" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOCK_REPEAT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="block-repeat-until">Opakovať do</Label>
                    <Input
                      id="block-repeat-until"
                      type="date"
                      value={blockDialogState.repeatUntilDate}
                      min={blockDialogState.startDate || undefined}
                      onChange={(event) =>
                        setBlockDialogState((current) => ({
                          ...current,
                          repeatUntilDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="block-all-day" className="text-sm font-medium">
                    Blokovať celý deň
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Preskočí výber času a uzamkne celý pracovný deň.
                  </p>
                </div>
                <Checkbox
                  id="block-all-day"
                  checked={blockDialogState.allDay}
                  onCheckedChange={(checked) =>
                    setBlockDialogState((current) => ({
                      ...current,
                      allDay: checked === true,
                    }))
                  }
                />
              </div>
            </div>

            {!blockDialogState.allDay && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm">
                  <Label htmlFor="block-start-time">Čas od</Label>
                  <Input
                    id="block-start-time"
                    type="time"
                    step={900}
                    value={blockDialogState.startTime}
                    onChange={(event) =>
                      setBlockDialogState((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5 rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm">
                  <Label htmlFor="block-end-time">Čas do</Label>
                  <Input
                    id="block-end-time"
                    type="time"
                    step={900}
                    value={blockDialogState.endTime}
                    onChange={(event) =>
                      setBlockDialogState((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {blockDialogValidationError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-sm font-medium text-destructive">{blockDialogValidationError}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-border/60 px-5 py-4 sm:px-6">
            <Button variant="outline" className="min-h-[44px] flex-1" onClick={() => setBlockDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button className="min-h-[44px] flex-1" onClick={handleCreateBlock} disabled={blockDialogSaving}>
              {blockDialogSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložiť
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from "react";
import { addMinutes, startOfDay, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import { db } from "@/integrations/firebase/config";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  BookingCalendar,
  statusToColor,
  type BookingCalendarEvent,
  type BookingCalendarMode,
  type SlotInfo,
} from "@/components/booking-calendar";
import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessInfo } from "@/hooks/useBusinessInfo";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  fromCalendarWallClockDateToUtcIso,
  getBusinessDayUtcRange,
  toCalendarWallClockDate,
} from "@/lib/calendarEventUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, Check, Plus, Trash2, Lock } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import {
  adminCalendarQuickAction,
  type AdminCalendarRepeatFrequency,
} from "@/integrations/firebase/adminCalendarQuickAction";
import { toCallableErrorMessage } from "@/integrations/firebase/callableError";

const STATUS_LABELS: Record<string, string> = {
  pending: "Čaká na potvrdenie",
  confirmed: "Potvrdená",
  cancelled: "Zrušená",
  completed: "Dokončená",
  blocked: "Blokovaný čas",
};

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

function safeString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return fallback;
}

function normalizeIdentity(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

interface ServiceOption {
  id: string;
  name_sk: string;
  duration_minutes: number;
}

interface EmployeeProfile {
  id: string;
  display_name: string;
  color: string | null;
}

interface AppointmentResource {
  id: string;
  event_type: "appointment";
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  start_at: string;
  end_at: string;
  status: string;
  employee_id: string;
  employee_name: string;
  employee_color: string | null;
}

interface TimeBlockResource {
  id: string;
  event_type: "time_block";
  employee_id: string;
  employee_name: string;
  employee_color: string | null;
  reason: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  repeat: boolean;
  repeat_frequency: AdminCalendarRepeatFrequency | null;
  repeat_until_date: string | null;
}

type CalendarResource = AppointmentResource | TimeBlockResource;

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  resource: CalendarResource;
}

interface NewApptForm {
  customerName: string;
  customerPhone: string;
  serviceId: string;
}

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

export default function MySchedulePage() {
  const { businessId } = useBusiness();
  const { info: businessInfo } = useBusinessInfo(businessId);
  const { user, profile } = useAuth();
  const business = businessInfo?.business;
  const openingHours = businessInfo?.hours;
  const overrides = businessInfo?.overrides;
  const calendarTimezone =
    typeof business?.timezone === "string" && business.timezone.trim().length > 0
      ? business.timezone
      : DEFAULT_BUSINESS_TIMEZONE;

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<BookingCalendarMode>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [newApptModal, setNewApptModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [newApptForm, setNewApptForm] = useState<NewApptForm>({
    customerName: "",
    customerPhone: "",
    serviceId: "",
  });
  const [savingAppt, setSavingAppt] = useState(false);

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

  useEffect(() => {
    if (!user) {
      setEmployee(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "employees"),
            where("business_id", "==", businessId),
            where("profile_id", "==", user.id),
            limit(1),
          ),
        );

        if (cancelled) return;

        if (!snap.empty) {
          const employeeDoc = snap.docs[0];
          const employeeData = employeeDoc.data();
          setEmployee({
            id: employeeDoc.id,
            display_name: safeString(employeeData.display_name, "Môj rozvrh"),
            color: typeof employeeData.color === "string" ? employeeData.color : null,
          });
          return;
        }

        const employeeListSnap = await getDocs(
          query(collection(db, "employees"), where("business_id", "==", businessId)),
        );

        const candidates = employeeListSnap.docs.map((employeeDoc) => ({
          id: employeeDoc.id,
          data: employeeDoc.data(),
        }));

        const emailMatches =
          user.email
            ? candidates.filter(
                (candidate) =>
                  normalizeIdentity(candidate.data.email) === normalizeIdentity(user.email),
              )
            : [];

        const profileName = normalizeIdentity(profile?.full_name);
        const nameMatches = profileName
          ? candidates.filter(
              (candidate) =>
                normalizeIdentity(candidate.data.display_name) === profileName,
            )
          : [];

        const emailLocalPart = normalizeIdentity(user.email?.split("@")[0]);
        const localPartMatches = emailLocalPart
          ? candidates.filter(
              (candidate) =>
                normalizeIdentity(candidate.data.display_name) === emailLocalPart,
            )
          : [];

        const matchedCandidate =
          (emailMatches.length === 1 ? emailMatches[0] : null) ??
          (nameMatches.length === 1 ? nameMatches[0] : null) ??
          (localPartMatches.length === 1 ? localPartMatches[0] : null);

        if (!matchedCandidate) {
          setEmployee(null);
          setLoading(false);
          return;
        }

        setEmployee({
          id: matchedCandidate.id,
          display_name: safeString(matchedCandidate.data.display_name, "Môj rozvrh"),
          color: typeof matchedCandidate.data.color === "string" ? matchedCandidate.data.color : null,
        });
      } catch (error) {
        if (!cancelled) {
          console.error("MySchedulePage: failed to resolve employee", error);
          setEmployee(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId, profile?.full_name, user]);

  useEffect(() => {
    if (!businessId) return;

    getDocs(query(collection(db, "services"), where("business_id", "==", businessId)))
      .then((snap) => {
        setServices(
          snap.docs.map((serviceDoc) => ({
            id: serviceDoc.id,
            name_sk: safeString(serviceDoc.data().name_sk, "Bez názvu"),
            duration_minutes: Number(serviceDoc.data().duration_minutes ?? 30),
          })),
        );
      })
      .catch((error) => {
        console.error("MySchedulePage: failed to load services", error);
      });
  }, [businessId]);

  const loadEvents = useCallback(async () => {
    if (!businessId || !employee?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [appointmentsSnap, blocksSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "appointments"),
            where("business_id", "==", businessId),
            where("employee_id", "==", employee.id),
            orderBy("start_at"),
          ),
        ),
        getDocs(
          query(
            collection(db, "time_blocks"),
            where("business_id", "==", businessId),
            where("employee_id", "==", employee.id),
            orderBy("start_at"),
          ),
        ),
      ]);

      const appointmentEvents: CalEvent[] = [];
      for (const appointmentDoc of appointmentsSnap.docs) {
        const appointment = appointmentDoc.data() as {
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_id?: string;
          service_name?: string | null;
          service_id?: string;
          start_at?: string;
          end_at?: string;
          status?: string;
        };

        let customerName = safeString(appointment.customer_name, "Neznámy klient");
        if (!appointment.customer_name && appointment.customer_id) {
          const customerSnap = await getDoc(doc(db, "customers", appointment.customer_id));
          if (customerSnap.exists()) {
            customerName = safeString(customerSnap.data().full_name, "Neznámy klient");
          }
        }

        let serviceName = safeString(appointment.service_name, "Bez názvu služby");
        if (!appointment.service_name && appointment.service_id) {
          const serviceSnap = await getDoc(doc(db, "services", appointment.service_id));
          if (serviceSnap.exists()) {
            serviceName = safeString(serviceSnap.data().name_sk, "Bez názvu služby");
          }
        }

        const startAt = appointment.start_at ?? new Date().toISOString();
        const endAt = appointment.end_at ?? startAt;

        appointmentEvents.push({
          id: appointmentDoc.id,
          title: `${customerName} – ${serviceName}`,
          start: toCalendarWallClockDate(startAt, calendarTimezone),
          end: toCalendarWallClockDate(endAt, calendarTimezone),
          status: appointment.status ?? "pending",
          resource: {
            id: appointmentDoc.id,
            event_type: "appointment",
            customer_name: customerName,
            customer_phone: appointment.customer_phone ?? null,
            service_name: serviceName,
            start_at: startAt,
            end_at: endAt,
            status: appointment.status ?? "pending",
            employee_id: employee.id,
            employee_name: employee.display_name,
            employee_color: employee.color,
          },
        });
      }

      const blockedEvents: CalEvent[] = blocksSnap.docs.map((blockDoc) => {
        const row = blockDoc.data() as Record<string, unknown>;
        const rawStart =
          typeof row.start_at === "string" ? row.start_at : new Date().toISOString();
        const rawEnd = typeof row.end_at === "string" ? row.end_at : rawStart;
        const reason = safeString(row.reason, DEFAULT_BLOCK_REASON);
        return {
          id: blockDoc.id,
          title: `Blok: ${reason}`,
          start: toCalendarWallClockDate(rawStart, calendarTimezone),
          end: toCalendarWallClockDate(rawEnd, calendarTimezone),
          status: "blocked",
          resource: {
            id: blockDoc.id,
            event_type: "time_block",
            employee_id: employee.id,
            employee_name:
              typeof row.employee_name === "string" ? row.employee_name : employee.display_name,
            employee_color:
              typeof row.employee_color === "string" ? row.employee_color : employee.color,
            reason,
            start_at: rawStart,
            end_at: rawEnd,
            all_day: row.all_day === true,
            repeat: row.repeat === true,
            repeat_frequency:
              typeof row.repeat_frequency === "string"
                ? (row.repeat_frequency as AdminCalendarRepeatFrequency)
                : null,
            repeat_until_date:
              typeof row.repeat_until_date === "string" ? row.repeat_until_date : null,
          },
        };
      });

      const nextEvents = [...appointmentEvents, ...blockedEvents].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      );
      setEvents(nextEvents);
    } catch (error) {
      console.error("MySchedulePage: failed to load events", error);
      toast.error("Nepodarilo sa načítať rozvrh");
    } finally {
      setLoading(false);
    }
  }, [businessId, calendarTimezone, employee]);

  useEffect(() => {
    if (employee?.id) {
      void loadEvents();
    }
  }, [employee?.id, loadEvents]);

  const bookingCalendarEvents: BookingCalendarEvent[] = useMemo(
    () =>
      events.map((event) => {
        const employeeColor = event.resource.employee_color;
        return {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          color: employeeColor || (event.status === "blocked" ? "cancelled" : statusToColor(event.status)),
          resource: event.resource,
        };
      }),
    [events],
  );

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

  const handleSelectEvent = (event: BookingCalendarEvent) => {
    const resource = event.resource as CalendarResource | undefined;
    if (!resource) return;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      status: resource.event_type === "time_block" ? "blocked" : resource.status,
      resource,
    });
    setConfirmDelete(false);
    setDetailModal(true);
  };

  const openBlockDialog = useCallback(
    (params: {
      start: Date;
      end: Date;
      employeeId?: string;
      reason?: string;
      allDay?: boolean;
    }) => {
      const targetEmployeeId = params.employeeId || employee?.id || "";
      if (!targetEmployeeId) {
        toast.error("Váš účet nie je prepojený so zamestnancom.");
        return;
      }

      setBlockDialogState({
        employeeId: targetEmployeeId,
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
    [employee],
  );

  const handleSelectSlot = (slot: SlotInfo) => {
    if (slot.intent === "block") {
      openBlockDialog({
        start: slot.start,
        end: slot.end,
        employeeId: employee?.id,
      });
      return;
    }

    setSelectedSlot(slot);
    setNewApptForm({
      customerName: "",
      customerPhone: "",
      serviceId: services[0]?.id ?? "",
    });
    setNewApptModal(true);
  };

  const buildToolbarActionSlot = useCallback((baseDate: Date) => {
    const start = startOfDay(baseDate);
    start.setHours(TOOLBAR_ACTION_START_HOUR, 0, 0, 0);
    const end = addMinutes(start, TOOLBAR_ACTION_DURATION_MINUTES);
    return {
      start,
      end,
      resourceId: employee?.id,
      resourceName: employee?.display_name,
      intent: "book" as const,
    };
  }, [employee?.display_name, employee?.id]);

  const handleToolbarCreateBooking = useCallback(() => {
    handleSelectSlot(buildToolbarActionSlot(date));
  }, [buildToolbarActionSlot, date]);

  const handleToolbarBlock = useCallback(() => {
    const slot = buildToolbarActionSlot(date);
    openBlockDialog({
      start: slot.start,
      end: slot.end,
      employeeId: employee?.id,
    });
  }, [buildToolbarActionSlot, date, employee?.id, openBlockDialog]);

  const handleJumpToday = useCallback(() => {
    setDate(new Date());
    setView("day");
  }, []);

  const handleMarkCompleted = async () => {
    if (!selectedEvent || selectedEvent.resource.event_type !== "appointment") return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), {
        status: "completed",
        updated_at: new Date().toISOString(),
      });
      toast.success("Rezervácia dokončená");
      setDetailModal(false);
      await loadEvents();
    } catch {
      toast.error("Chyba pri aktualizácii");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmAppt = async () => {
    if (!selectedEvent || selectedEvent.resource.event_type !== "appointment") return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), {
        status: "confirmed",
        updated_at: new Date().toISOString(),
      });
      toast.success("Rezervácia potvrdená");
      setDetailModal(false);
      await loadEvents();
    } catch {
      toast.error("Chyba pri potvrdení");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelAppt = async () => {
    if (!selectedEvent || selectedEvent.resource.event_type !== "appointment") return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), {
        status: "cancelled",
        updated_at: new Date().toISOString(),
      });
      toast.success("Rezervácia zrušená");
      setDetailModal(false);
      await loadEvents();
    } catch {
      toast.error("Chyba pri rušení");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedEvent || selectedEvent.resource.event_type !== "appointment") return;
    setUpdatingStatus(true);
    try {
      await deleteDoc(doc(db, "appointments", selectedEvent.id));
      toast.success("Rezervácia zmazaná");
      setDetailModal(false);
      await loadEvents();
    } catch {
      toast.error("Chyba pri mazaní");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteBlock = async () => {
    if (!selectedEvent || selectedEvent.resource.event_type !== "time_block") return;
    setUpdatingStatus(true);
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
      toast.error(toCallableErrorMessage(error, "Nepodarilo sa odstrániť blokáciu"));
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
      console.error("MySchedulePage: create block failed", error);
      toast.error(toCallableErrorMessage(error, "Nepodarilo sa uložiť blokáciu"));
    } finally {
      setBlockDialogSaving(false);
    }
  };

  const handleCreateAppt = async () => {
    if (!employee?.id || !businessId || !selectedSlot || !newApptForm.customerName.trim()) {
      toast.error("Vyplň meno zákazníka");
      return;
    }
    const service = services.find((item) => item.id === newApptForm.serviceId);
    if (!service) {
      toast.error("Vyber službu");
      return;
    }

    setSavingAppt(true);
    try {
      const start = selectedSlot.start;
      const end = new Date(start.getTime() + service.duration_minutes * 60_000);
      const startAtUtc = fromCalendarWallClockDateToUtcIso(start, calendarTimezone);
      const endAtUtc = fromCalendarWallClockDateToUtcIso(end, calendarTimezone);
      await addDoc(collection(db, "appointments"), {
        business_id: businessId,
        employee_id: employee.id,
        customer_name: newApptForm.customerName.trim(),
        customer_phone: newApptForm.customerPhone.trim() || null,
        service_id: service.id,
        service_name: service.name_sk,
        start_at: startAtUtc,
        end_at: endAtUtc,
        status: "confirmed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast.success("Rezervácia vytvorená");
      setNewApptModal(false);
      await loadEvents();
    } catch {
      toast.error("Chyba pri vytváraní rezervácie");
    } finally {
      setSavingAppt(false);
    }
  };

  if (!employee && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>Váš účet nie je prepojený so zamestnancom.</p>
        <p className="text-sm">Kontaktujte administrátora.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      <AdminPageHeader
        title="Môj rozvrh"
        description="Vaše rezervácie, blokácie a rýchle akcie na jednom mieste."
      />

      {loading && (
        <div className="flex justify-end">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 h-[calc(100vh-10rem)] min-h-[42rem]">
        <BookingCalendar
          events={bookingCalendarEvents}
          date={date}
          setDate={setDate}
          mode={view}
          setMode={setView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          businessHours={{ hours: openingHours, overrides }}
          resources={
            employee
              ? [{ id: employee.id, display_name: employee.display_name, color: employee.color }]
              : []
          }
          headerActions={
            <div className="flex w-full flex-wrap items-stretch justify-end gap-2" data-testid="calendar-header-actions">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-w-0 flex-1 sm:flex-none"
                onClick={handleJumpToday}
              >
                Dnes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-w-0 flex-1 sm:flex-none"
                onClick={handleToolbarBlock}
              >
                Blokácia
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-w-0 flex-1 bg-gold text-gold-foreground hover:bg-gold/90 sm:flex-none"
                onClick={handleToolbarCreateBooking}
              >
                Nová rezervácia
              </Button>
            </div>
          }
        />
      </div>

      <Dialog
        open={detailModal}
        onOpenChange={(open) => {
          setDetailModal(open);
          if (!open) setConfirmDelete(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.resource.event_type === "time_block" ? "Detail blokácie" : "Detail rezervácie"}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.resource.event_type === "time_block"
                ? "Údaje o blokovanom čase a možnosti správy blokácie."
                : "Údaje o termíne a možnosti správy rezervácie."}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && selectedEvent.resource.event_type === "time_block" && (
            <div className="space-y-4">
              <Badge className="text-xs border-0 bg-secondary text-secondary-foreground">
                {STATUS_LABELS.blocked}
              </Badge>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{selectedEvent.resource.reason}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{selectedEvent.resource.employee_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>
                    {fmtDate(selectedEvent.start, "d. M. yyyy HH:mm")} –{" "}
                    {fmtDate(selectedEvent.end, "HH:mm")}
                  </span>
                </div>
                {selectedEvent.resource.all_day && (
                  <Badge variant="outline" className="text-xs">
                    Blokovaný celý deň
                  </Badge>
                )}
                {selectedEvent.resource.repeat && (
                  <Badge variant="outline" className="text-xs">
                    Opakovanie:{" "}
                    {BLOCK_REPEAT_OPTIONS.find(
                      (option) => option.value === selectedEvent.resource.repeat_frequency,
                    )?.label ?? "Aktívne"}
                  </Badge>
                )}
              </div>

              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleDeleteBlock}
                disabled={updatingStatus}
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Odstrániť blok
              </Button>
            </div>
          )}

          {selectedEvent && selectedEvent.resource.event_type === "appointment" && (
            <div className="space-y-4">
              <Badge className="text-xs border-0 bg-secondary text-secondary-foreground">
                {STATUS_LABELS[selectedEvent.status] ?? selectedEvent.status}
              </Badge>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{selectedEvent.resource.customer_name}</span>
                </div>
                {selectedEvent.resource.customer_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedEvent.resource.customer_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <LogoIcon size="sm" className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedEvent.resource.service_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>
                    {fmtDate(selectedEvent.start, "d. M. yyyy HH:mm")} –{" "}
                    {fmtDate(selectedEvent.end, "HH:mm")}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex flex-col gap-2">
                {selectedEvent.status === "pending" && (
                  <Button size="sm" className="w-full" onClick={handleConfirmAppt} disabled={updatingStatus}>
                    {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Potvrdiť rezerváciu
                  </Button>
                )}
                {selectedEvent.status === "confirmed" && (
                  <Button size="sm" className="w-full" onClick={handleMarkCompleted} disabled={updatingStatus}>
                    {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Označiť ako dokončenú
                  </Button>
                )}
                {selectedEvent.status !== "cancelled" && selectedEvent.status !== "completed" && (
                  <Button size="sm" variant="outline" className="w-full" onClick={handleCancelAppt} disabled={updatingStatus}>
                    Zrušiť rezerváciu
                  </Button>
                )}

                {confirmDelete ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDeleteAppointment}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áno, zmazať"}
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                      Zrušiť
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Zmazať rezerváciu
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newApptModal} onOpenChange={setNewApptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nová rezervácia
            </DialogTitle>
            <DialogDescription>
              {selectedSlot ? fmtDate(selectedSlot.start, "EEEE d. M. yyyy · HH:mm", { locale: sk }) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Meno zákazníka *</Label>
              <Input
                placeholder="Meno a priezvisko"
                value={newApptForm.customerName}
                onChange={(event) =>
                  setNewApptForm((current) => ({ ...current, customerName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefón</Label>
              <Input
                placeholder="+421 9xx xxx xxx"
                value={newApptForm.customerPhone}
                onChange={(event) =>
                  setNewApptForm((current) => ({ ...current, customerPhone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Služba *</Label>
              <Select
                value={newApptForm.serviceId}
                onValueChange={(serviceId) =>
                  setNewApptForm((current) => ({ ...current, serviceId }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyber službu" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name_sk} · {service.duration_minutes} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleCreateAppt} disabled={savingAppt}>
                {savingAppt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Vytvoriť rezerváciu
              </Button>
              <Button variant="ghost" onClick={() => setNewApptModal(false)}>
                Zrušiť
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pridať blokovaný čas</DialogTitle>
            <DialogDescription>
              Zablokujte konkrétny čas alebo vytvorte opakovanú sériu. Kolízie sa overia ešte pred uložením.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="block-employee">Vyberte pracovníka / položku</Label>
              <Input
                id="block-employee"
                value={employee?.display_name ?? "Nepriradený zamestnanec"}
                readOnly
                disabled
              />
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <Checkbox
                  id="block-repeat"
                  checked={blockDialogState.repeat}
                  onCheckedChange={(checked) =>
                    setBlockDialogState((current) => ({
                      ...current,
                      repeat: checked === true,
                      repeatUntilDate:
                        checked === true ? current.repeatUntilDate || current.startDate : current.startDate,
                    }))
                  }
                />
                <Label htmlFor="block-repeat" className="cursor-pointer">
                  Opakovať blokáciu
                </Label>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <Checkbox
                  id="block-all-day"
                  checked={blockDialogState.allDay}
                  onCheckedChange={(checked) =>
                    setBlockDialogState((current) => ({ ...current, allDay: checked === true }))
                  }
                />
                <Label htmlFor="block-all-day" className="cursor-pointer">
                  Blokovať celý deň
                </Label>
              </div>
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

            {!blockDialogState.allDay && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
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

                <div className="space-y-1.5">
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
              <p className="text-sm font-medium text-destructive">{blockDialogValidationError}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setBlockDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button className="flex-1" onClick={handleCreateBlock} disabled={blockDialogSaving}>
              {blockDialogSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložiť
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

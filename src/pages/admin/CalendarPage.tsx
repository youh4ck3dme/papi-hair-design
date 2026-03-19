import { useEffect, useState, useCallback, useMemo } from "react";
import { addMinutes, startOfDay, addDays, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import { auth, db } from "@/integrations/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
  addDoc,
  updateDoc,
  limit,
  Timestamp
} from "firebase/firestore";
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
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, Mail, X, Check, Copy, ExternalLink, Download, Printer, MoreVertical, FilterX } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { adminUpdateBookingStatus } from "@/integrations/firebase/adminUpdateBookingStatus";
import {
  ADMIN_BOOKING_STATUS_LABELS,
  canAdminCancelBooking,
  canAdminCompleteBooking,
  canAdminConfirmBooking,
  canAdminMarkNoShow,
} from "@/lib/adminBookingStatus";
import { buildAdminCalendarCsv, buildAdminCalendarPrintHtml } from "@/lib/adminCalendarExport";

interface CalEvent {
  id: string; title: string; start: Date; end: Date; status: string; resource: any;
}

interface CustomerHistoryItem {
  id: string;
  start_at: string;
  status: string;
  service_name: string | null;
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

  const filtersStorageKey = `admin-calendar-filters:${businessId}`;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      let apptsQuery = query(
        collection(db, "appointments"),
        where("business_id", "==", businessId)
      );

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
            apptsQuery = query(apptsQuery, where("employee_id", "==", empId));
          }
        }
      }

      const apptsSnap = await getDocs(apptsQuery);

      // In Firestore, we don't have automatic foreign key joining (manual client-side denormalization required)
      // For small sets, we can fetch related data manually or denormalize.
      // For the blueprint, we'll assume we either denormalized or we fetch basic info.
      // But to match the UI perfectly, we might need a helper to fetch customers/services/employees.

      const eventsList: CalEvent[] = apptsSnap.docs.map((doc) => {
        const a = doc.data();
        return {
          id: doc.id,
          // Use denormalized labels if available or placeholder
          title: `${a.customer_name ?? "Zákazník"} – ${a.service_name ?? "Služba"}`,
          start: a.start_at instanceof Timestamp ? a.start_at.toDate() : new Date(a.start_at),
          end: a.end_at instanceof Timestamp ? a.end_at.toDate() : new Date(a.end_at),
          status: a.status,
          resource: { ...a, id: doc.id },
        };
      });

      setEvents(eventsList);
    } catch (err) {
      console.error("CalendarPage: error loading events", err);
    } finally {
      setLoading(false);
    }
  }, [businessId, isOwnerOrAdmin]);


  useEffect(() => {
    loadEvents();

    const loadData = async () => {
      try {
        const [bizSnap, svcSnap, empSnap, memSnap] = await Promise.all([
          getDoc(doc(db, "businesses", businessId)),
          getDocs(query(collection(db, "services"), where("business_id", "==", businessId), where("is_active", "==", true))),
          getDocs(query(collection(db, "employees"), where("business_id", "==", businessId), where("is_active", "==", true))),
          getDocs(query(collection(db, "memberships"), where("business_id", "==", businessId)))
        ]);

        setServices(svcSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (!empSnap.empty) {
          const emps = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setEmployees(emps);

          const ids = emps.map(e => e.id);
          // Fetch schedules for these employees
          const schedSnap = await getDocs(query(
            collection(db, "schedules"),
            where("employee_id", "in", ids.slice(0, 10))
          ));

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
        }
        setMemberships(memSnap.docs.map(d => ({ profile_id: d.data().profile_id, role: d.data().role })));
      } catch (err) {
        console.error("CalendarPage: error loading secondary data", err);
      }
    };

    loadData();
  }, [businessId, loadEvents]);

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


  const loadAvailableSlots = useCallback(async (slotDate: Date, employeeId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !employeeId || !business) return;

    const dayStart = startOfDay(slotDate);
    const dayEnd = addDays(dayStart, 1);

    try {
      const apptsSnap = await getDocs(query(
        collection(db, "appointments"),
        where("employee_id", "==", employeeId),
        where("start_at", ">=", dayStart.toISOString()),
        where("start_at", "<", dayEnd.toISOString())
      ));

      const existing: ExistingAppointment[] = apptsSnap.docs
        .map((d) => d.data())
        .filter((appointment) => appointment.status !== "cancelled")
        .map((appointment) => ({
          start_at:
            appointment.start_at instanceof Timestamp
              ? appointment.start_at.toDate().toISOString()
              : appointment.start_at,
          end_at:
            appointment.end_at instanceof Timestamp
              ? appointment.end_at.toDate().toISOString()
              : appointment.end_at,
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
  }, [services, business, schedules]);

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
    if (!isOwnerOrAdmin) return;
    setSelectedSlot(slot);
    setCustomStartTime(fmtDate(slot.start, "HH:mm"));
    setBookForm({
      service_id: "",
      employee_id: "",
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
        console.error("CalendarPage: error loading customer history", error);
        setCustomerHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    void loadCustomerHistory();
  }, [businessId, detailModal, selectedEvent]);

  const bookingCalendarEvents: BookingCalendarEvent[] = filteredEvents.map((e) => {
    const employeeColor = (e.resource as any)?.employee_color;
    return {
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      color: employeeColor || statusToColor(e.status),
      resource: e.resource,
    };
  });

  const selectedDayEvents = filteredEvents
    .filter((event) => fmtDate(event.start, "yyyy-MM-dd") === fmtDate(date, "yyyy-MM-dd"))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const exportRows = selectedDayEvents.map((event) => ({
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
  }));

  const handleExportCsv = () => {
    const csv = buildAdminCalendarCsv(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kalendar-${fmtDate(date, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintDay = () => {
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
  };


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
        start_at: start.toISOString(),
        end_at: end.toISOString(),
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


  return (
    <div className="space-y-4 h-full max-w-full overflow-x-hidden calendar-page-root">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kalendár</h1>
        <div className="flex items-center gap-2">
          {compactActionMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Export a tlač">
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
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} disabled={exportRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handlePrintDay} disabled={exportRows.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                PDF / Tlač
              </Button>
            </>
          )}
          {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-2 max-w-full overflow-x-hidden">
        <div className="flex flex-wrap gap-2 pb-1">
          {[
            { id: "all", label: "Všetky stavy" },
            { id: "pending", label: "Čakajúce" },
            { id: "confirmed", label: "Potvrdené" },
            { id: "completed", label: "Dokončené" },
            { id: "no_show", label: "No-show" },
            { id: "cancelled", label: "Zrušené" },
          ].map((statusOption) => (
            <Button
              key={statusOption.id}
              type="button"
              size="sm"
              variant={statusFilter === statusOption.id ? "default" : "outline"}
              className="max-w-full"
              onClick={() => setStatusFilter(statusOption.id)}
            >
              {statusOption.label}
            </Button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={employeeFilter === "all" ? "default" : "outline"}
            className="max-w-full"
            onClick={() => setEmployeeFilter("all")}
          >
            Všetci zamestnanci
          </Button>
          {availableEmployees.map((employee: any) => (
            <Button
              key={employee.id}
              type="button"
              size="sm"
              variant={employeeFilter === employee.id ? "default" : "outline"}
              className="max-w-full"
              onClick={() => setEmployeeFilter(employee.id)}
            >
              {employee.display_name}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="max-w-full"
            onClick={() => {
              setStatusFilter("all");
              setEmployeeFilter("all");
            }}
          >
            <FilterX className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <div
        className="bg-card rounded-xl border border-border p-2 sm:p-4 flex flex-col min-h-0 max-w-full overflow-x-hidden calendar-page-shell"
        style={{ ["--calendar-shell-offset" as string]: compactActionMenu ? "150px" : "200px" }}
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
          resources={
            isOwnerOrAdmin
              ? availableEmployees.filter((employee: any) => employeeFilter === "all" || employee.id === employeeFilter)
              : availableEmployees.filter((employee: any) => employee.profile_id === activeMembership?.profile_id)
          }
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
                <SelectContent>{availableEmployees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}</SelectContent>
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
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-primary/10 bg-background/98 px-5 py-5 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Detail rezervácie</SheetTitle>
            <SheetDescription>
              Skontrolujte údaje rezervácie a podľa potreby upravte jej stav.
            </SheetDescription>
          </SheetHeader>
          {selectedEvent && (
            <div className="space-y-5 pt-5">
              <div className="rounded-2xl border border-primary/10 bg-card/50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Klient</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {selectedEvent.resource?.customer_name ?? selectedEvent.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEvent.resource?.service_name ?? "Služba"}
                    </p>
                  </div>
                  <Badge className="border-0 bg-secondary text-secondary-foreground">
                    {ADMIN_BOOKING_STATUS_LABELS[selectedEvent.status as keyof typeof ADMIN_BOOKING_STATUS_LABELS] ?? selectedEvent.status}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-3 rounded-2xl border border-border/80 bg-card/50 p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Meno</p>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <User className="h-4 w-4 text-primary" />
                    <span>{selectedEvent.resource?.customer_name ?? selectedEvent.title}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">E-mail</p>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="break-all">{selectedEvent.resource?.customer_email ?? "—"}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Telefón</p>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{selectedEvent.resource?.customer_phone ?? "—"}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Termín</p>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{fmtDate(selectedEvent.start, "d. M. yyyy HH:mm")} – {fmtDate(selectedEvent.end, "HH:mm")}</span>
                  </div>
                </div>
              </div>
              <Badge className="text-xs border-0 bg-secondary text-secondary-foreground">
                {ADMIN_BOOKING_STATUS_LABELS[selectedEvent.status as keyof typeof ADMIN_BOOKING_STATUS_LABELS] ?? selectedEvent.status}
              </Badge>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <LogoIcon size="sm" className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {selectedEvent.resource?.service_name && selectedEvent.resource?.employee_name
                      ? `${selectedEvent.resource.service_name} · ${selectedEvent.resource.employee_name}`
                      : selectedEvent.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{fmtDate(selectedEvent.start, "d. M. yyyy HH:mm")} – {fmtDate(selectedEvent.end, "HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-[0.2em]">Ref:</span>
                  <span className="font-mono text-sm text-foreground" title={selectedEvent.id}>{selectedEvent.id}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selectedEvent.id);
                        setCopyLabel("Skopírované");
                        setTimeout(() => setCopyLabel("Skopírovať"), 1500);
                      } catch {
                        setCopyLabel("Kópia zlyhala");
                        setTimeout(() => setCopyLabel("Skopírovať"), 1500);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> {copyLabel}
                  </button>
                  <a
                    href={`/dashboard/history?ref=${encodeURIComponent(selectedEvent.id)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> História
                  </a>
                </div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">História klienta</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {loadingHistory ? "…" : customerHistory.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Rezervácie priradené k tomuto klientovi</p>
                  </div>
                  <a
                    href={`/dashboard/history?ref=${encodeURIComponent(selectedEvent.id)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    História
                  </a>
                </div>
                {customerHistory.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {customerHistory.slice(0, 4).map((historyItem) => (
                      <div key={historyItem.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{historyItem.service_name ?? "Služba"}</p>
                          <p className="text-xs text-muted-foreground">{historyItem.start_at ? fmtDate(new Date(historyItem.start_at), "d. M. yyyy HH:mm") : "—"}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                          {ADMIN_BOOKING_STATUS_LABELS[historyItem.status as keyof typeof ADMIN_BOOKING_STATUS_LABELS] ?? historyItem.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Poznámka</Label>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Krátka interná poznámka k rezervácii"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" disabled={updatingStatus} onClick={handleSaveNote}>
                      {updatingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Uložiť poznámku
                    </Button>
                  </div>
                </div>
                {isOwnerOrAdmin && (
                <div className="grid gap-2 pt-1 sm:grid-cols-2">
                  {canAdminConfirmBooking(selectedEvent.status) && (
                    <Button size="sm" className="flex-1" onClick={() => handleStatusChange("confirmed")} disabled={updatingStatus}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Potvrdiť
                    </Button>
                  )}
                  {canAdminCompleteBooking(selectedEvent.status) && (
                    <>
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleStatusChange("completed")} disabled={updatingStatus}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Dokončiť
                      </Button>
                    </>
                  )}
                  {canAdminMarkNoShow(selectedEvent.status) && (
                    <>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleStatusChange("no_show")} disabled={updatingStatus}>
                        <X className="w-3.5 h-3.5 mr-1" /> No-show
                      </Button>
                    </>
                  )}
                  {canAdminCancelBooking(selectedEvent.status) && (
                    <Button size="sm" variant="outline" className="flex-1 text-rose-700 hover:text-rose-700" onClick={() => handleStatusChange("cancelled")} disabled={updatingStatus}>
                      <X className="w-3.5 h-3.5 mr-1" /> Zrušiť
                    </Button>
                  )}
                </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

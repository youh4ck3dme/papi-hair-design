import { useEffect, useState, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, X, Check } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";

const STATUS_LABELS: Record<string, string> = {
  pending: "Čaká na potvrdenie", confirmed: "Potvrdená",
  cancelled: "Zrušená", completed: "Dokončená",
};

interface CalEvent {
  id: string; title: string; start: Date; end: Date; status: string; resource: any;
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
  const [saving, setSaving] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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


  const filteredEmployees = useCallback(() => {
    let list = employees;
    if (!business?.allow_admin_as_provider) {
      list = list.filter((emp: any) => {
        if (!emp.profile_id) return true;
        const membership = memberships.find((m) => m.profile_id === emp.profile_id);
        if (!membership) return true;
        return membership.role === "employee" || membership.role === "owner" || membership.role === "admin";
      });
    }
    return list;
  }, [employees, business, memberships]);


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

  const handleSelectSlot = (slot: SlotInfo) => {
    if (!isOwnerOrAdmin) return;
    setSelectedSlot(slot);
    setBookForm({ service_id: "", employee_id: "", start_at: "" });
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
    setDetailModal(true);
  };

  const bookingCalendarEvents: BookingCalendarEvent[] = events.map((e) => {
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


  const handleBook = async () => {
    if (!bookForm.service_id || !bookForm.employee_id || !bookForm.start_at) { toast.error("Vyplňte všetky polia"); return; }
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

  const handleStatusChange = async (newStatus: "pending" | "confirmed" | "cancelled" | "completed") => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      toast.success("Status aktualizovaný");
      setDetailModal(false);
      loadEvents();
    } catch (err) {
      console.error("handleStatusChange error:", err);
      toast.error("Chyba pri aktualizácii");
    } finally {
      setUpdatingStatus(false);
    }
  };


  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kalendár</h1>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-0" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
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
          resources={isOwnerOrAdmin ? employees : employees.filter(e => e.profile_id === activeMembership?.profile_id)}
        />
      </div>

      {/* Booking Modal */}
      <Dialog open={bookingModal} onOpenChange={setBookingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nová rezervácia</DialogTitle>
            <DialogDescription>
              Vyberte službu, zamestnanca a dostupný čas pre novú rezerváciu.
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && <p className="text-sm text-muted-foreground">{fmtDate(selectedSlot.start, "EEEE, d. MMMM yyyy", { locale: sk })}</p>}
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Služba</Label>
              <Select value={bookForm.service_id} onValueChange={(v) => setBookForm((f) => ({ ...f, service_id: v, start_at: "" }))}>
                <SelectTrigger><SelectValue placeholder="Vyberte službu" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_sk} ({s.duration_minutes} min{s.price ? `, ${s.price}€` : ""})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zamestnanec</Label>
              <Select value={bookForm.employee_id} onValueChange={(v) => setBookForm((f) => ({ ...f, employee_id: v, start_at: "" }))}>
                <SelectTrigger><SelectValue placeholder="Vyberte zamestnanca" /></SelectTrigger>
                <SelectContent>{filteredEmployees().map((e: any) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {availableSlots.length > 0 && (
              <div className="space-y-1.5">
                <Label>Dostupný čas</Label>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {availableSlots.map((slot) => {
                    const iso = slot.toISOString();
                    return (
                      <button key={iso} onClick={() => setBookForm((f) => ({ ...f, start_at: iso }))}
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

      {/* Detail Modal */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail rezervácie</DialogTitle>
            <DialogDescription>
              Skontrolujte údaje rezervácie a podľa potreby upravte jej stav.
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <Badge className="text-xs border-0 bg-secondary text-secondary-foreground">
                {STATUS_LABELS[selectedEvent.status]}
              </Badge>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">
                    {selectedEvent.resource?.customer_name ?? selectedEvent.title}
                  </span>
                </div>
                {selectedEvent.resource?.customer_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedEvent.resource.customer_phone}</span>
                  </div>
                )}
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
              </div>
              {isOwnerOrAdmin && selectedEvent.status !== "cancelled" && selectedEvent.status !== "completed" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  {selectedEvent.status === "pending" && (
                    <Button size="sm" className="flex-1" onClick={() => handleStatusChange("confirmed")} disabled={updatingStatus}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Potvrdiť
                    </Button>
                  )}
                  {selectedEvent.status === "confirmed" && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleStatusChange("completed")} disabled={updatingStatus}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Dokončiť
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleStatusChange("cancelled")} disabled={updatingStatus}>
                    <X className="w-3.5 h-3.5 mr-1" /> Zrušiť
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

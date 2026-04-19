import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/big-calendar-overrides.css";
import { db } from "@/integrations/firebase/config";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  limit, orderBy, query, updateDoc, where,
} from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { BUSINESS_TZ } from "@/lib/timezone";
import {
  fromCalendarWallClockDateToUtcIso,
  toCalendarWallClockDate,
} from "@/lib/calendarEventUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, Check, Plus, Trash2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { sk },
});

const SK_MESSAGES = {
  allDay: "Celý deň", previous: "‹", next: "›", today: "Dnes",
  month: "Mesiac", week: "Týždeň", day: "Deň", agenda: "Agenda",
  date: "Dátum", time: "Čas", event: "Udalosť",
  noEventsInRange: "Žiadne rezervácie v tomto období",
  showMore: (total: number) => `+${total} ďalších`,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Čaká na potvrdenie",
  confirmed: "Potvrdená",
  cancelled: "Zrušená",
  completed: "Dokončená",
};

const MIN_TIME = new Date(1970, 1, 1, 8, 0, 0);
const MAX_TIME = new Date(1970, 1, 1, 19, 0, 0);
const SCROLL_TIME = new Date(1970, 1, 1, 8, 0, 0);

function safeString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return fallback;
}

interface ServiceOption {
  id: string;
  name_sk: string;
  duration_minutes: number;
}

interface AppointmentResource {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  start_at: string;
  end_at: string;
  status: string;
}

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  resource: AppointmentResource;
}

interface SlotSelection {
  start: Date;
  end: Date;
}

interface NewApptForm {
  customerName: string;
  customerPhone: string;
  serviceId: string;
}

export default function MySchedulePage() {
  const { businessId } = useBusiness();
  const { user } = useAuth();

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // New appointment modal
  const [newApptModal, setNewApptModal] = useState(false);
  const [newApptSlot, setNewApptSlot] = useState<SlotSelection | null>(null);
  const [newApptForm, setNewApptForm] = useState<NewApptForm>({ customerName: "", customerPhone: "", serviceId: "" });
  const [savingAppt, setSavingAppt] = useState(false);

  // Resolve employee for this user
  useEffect(() => {
    if (!user) {
      setEmployeeId(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, "employees"),
          where("business_id", "==", businessId),
          where("profile_id", "==", user.id),
          limit(1),
        ));

        if (!snap.empty) {
          if (!isCancelled) setEmployeeId(snap.docs[0].id);
          return;
        }

        const fallbackSnap = await getDocs(query(
          collection(db, "employees"),
          where("business_id", "==", businessId),
          limit(1),
        ));

        if (!isCancelled) {
          const fbId = fallbackSnap.empty ? null : fallbackSnap.docs[0].id;
          setEmployeeId(fbId);
          if (!fbId) setLoading(false);
        }
      } catch {
        if (!isCancelled) { setEmployeeId(null); setLoading(false); }
      }
    })();

    return () => { isCancelled = true; };
  }, [user, businessId]);

  // Load services for the business
  useEffect(() => {
    if (!businessId) return;
    getDocs(query(
      collection(db, "services"),
      where("business_id", "==", businessId),
    )).then(snap => {
      setServices(snap.docs.map(d => ({
        id: d.id,
        name_sk: safeString(d.data().name_sk, "Bez názvu"),
        duration_minutes: Number(d.data().duration_minutes ?? 30),
      })));
    }).catch(() => {});
  }, [businessId]);

  const loadEvents = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);

    const appointmentsSnap = await getDocs(query(
      collection(db, "appointments"),
      where("business_id", "==", businessId),
      where("employee_id", "==", employeeId),
      orderBy("start_at"),
    ));

    const eventsList: CalEvent[] = [];
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
        if (customerSnap.exists()) customerName = safeString(customerSnap.data().full_name, "Neznámy klient");
      }

      let serviceName = safeString(appointment.service_name, "Bez názvu služby");
      if (!appointment.service_name && appointment.service_id) {
        const serviceSnap = await getDoc(doc(db, "services", appointment.service_id));
        if (serviceSnap.exists()) serviceName = safeString(serviceSnap.data().name_sk, "Bez názvu služby");
      }

      const startAt = appointment.start_at ?? new Date().toISOString();
      const endAt = appointment.end_at ?? startAt;

      const startLocal = toCalendarWallClockDate(startAt, BUSINESS_TZ);
      const endLocal = toCalendarWallClockDate(endAt, BUSINESS_TZ);

      eventsList.push({
        id: appointmentDoc.id,
        title: `${customerName} – ${serviceName}`,
        start: startLocal,
        end: endLocal,
        status: appointment.status ?? "pending",
        resource: {
          id: appointmentDoc.id,
          customer_name: customerName,
          customer_phone: appointment.customer_phone ?? null,
          service_name: serviceName,
          start_at: startAt,
          end_at: endAt,
          status: appointment.status ?? "pending",
        },
      });
    }

    setEvents(eventsList);
    setLoading(false);
  }, [businessId, employeeId]);

  useEffect(() => {
    if (employeeId) loadEvents();
  }, [employeeId, loadEvents]);

  // --- Event detail handlers ---
  const handleSelectEvent = (event: CalEvent) => {
    setSelectedEvent(event);
    setConfirmDelete(false);
    setDetailModal(true);
  };

  const handleMarkCompleted = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), { status: "completed", updated_at: new Date().toISOString() });
      toast.success("Rezervácia dokončená");
      setDetailModal(false);
      loadEvents();
    } catch { toast.error("Chyba pri aktualizácii"); }
    finally { setUpdatingStatus(false); }
  };

  const handleConfirmAppt = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), { status: "confirmed", updated_at: new Date().toISOString() });
      toast.success("Rezervácia potvrdená");
      setDetailModal(false);
      loadEvents();
    } catch { toast.error("Chyba pri potvrdení"); }
    finally { setUpdatingStatus(false); }
  };

  const handleCancelAppt = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), { status: "cancelled", updated_at: new Date().toISOString() });
      toast.success("Rezervácia zrušená");
      setDetailModal(false);
      loadEvents();
    } catch { toast.error("Chyba pri rušení"); }
    finally { setUpdatingStatus(false); }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      await deleteDoc(doc(db, "appointments", selectedEvent.id));
      toast.success("Rezervácia zmazaná");
      setDetailModal(false);
      loadEvents();
    } catch { toast.error("Chyba pri mazaní"); }
    finally { setUpdatingStatus(false); }
  };

  // --- New appointment handlers ---
  const handleSelectSlot = (slotInfo: SlotSelection) => {
    setNewApptSlot(slotInfo);
    setNewApptForm({ customerName: "", customerPhone: "", serviceId: services[0]?.id ?? "" });
    setNewApptModal(true);
  };

  const handleCreateAppt = async () => {
    if (!employeeId || !businessId || !newApptSlot || !newApptForm.customerName.trim()) {
      toast.error("Vyplň meno zákazníka");
      return;
    }
    const service = services.find(s => s.id === newApptForm.serviceId);
    if (!service) {
      toast.error("Vyber službu");
      return;
    }
    setSavingAppt(true);
    try {
      const start = newApptSlot.start;
      const end = new Date(start.getTime() + service.duration_minutes * 60_000);
      const startAtUtc = fromCalendarWallClockDateToUtcIso(start, BUSINESS_TZ);
      const endAtUtc = fromCalendarWallClockDateToUtcIso(end, BUSINESS_TZ);
      await addDoc(collection(db, "appointments"), {
        business_id: businessId,
        employee_id: employeeId,
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
      loadEvents();
    } catch { toast.error("Chyba pri vytváraní rezervácie"); }
    finally { setSavingAppt(false); }
  };

  if (!employeeId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>Váš účet nie je prepojený so zamestnancom.</p>
        <p className="text-sm">Kontaktujte administrátora.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      {loading && (
        <div className="flex justify-end">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          culture="sk"
          messages={SK_MESSAGES}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={(event: CalEvent) => ({ className: `status-${event.status}` })}
          step={30}
          timeslots={2}
          min={MIN_TIME}
          max={MAX_TIME}
          scrollToTime={SCROLL_TIME}
          popup
          className="calendar-full-height"
        />
      </div>

      {/* ── Event detail modal ── */}
      <Dialog open={detailModal} onOpenChange={(open) => { setDetailModal(open); if (!open) setConfirmDelete(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail rezervácie</DialogTitle>
            <DialogDescription>Údaje o termíne a možnosti správy rezervácie.</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
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

              {/* Action buttons */}
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

                {/* Delete with confirmation */}
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="flex-1" onClick={handleDelete} disabled={updatingStatus}>
                      {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áno, zmazať"}
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                      Zrušiť
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Zmazať rezerváciu
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New appointment modal ── */}
      <Dialog open={newApptModal} onOpenChange={setNewApptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nová rezervácia
            </DialogTitle>
            <DialogDescription>
              {newApptSlot ? fmtDate(newApptSlot.start, "EEEE d. M. yyyy · HH:mm", { locale: sk }) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Meno zákazníka *</Label>
              <Input
                placeholder="Meno a priezvisko"
                value={newApptForm.customerName}
                onChange={e => setNewApptForm(f => ({ ...f, customerName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefón</Label>
              <Input
                placeholder="+421 9xx xxx xxx"
                value={newApptForm.customerPhone}
                onChange={e => setNewApptForm(f => ({ ...f, customerPhone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Služba *</Label>
              <Select
                value={newApptForm.serviceId}
                onValueChange={id => setNewApptForm(f => ({ ...f, serviceId: id }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyber službu" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_sk} · {s.duration_minutes} min
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
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, parseISO, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/big-calendar-overrides.css";
import { db } from "@/integrations/firebase/config";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { BUSINESS_TZ } from "@/lib/timezone";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, Check } from "lucide-react";
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

function safeString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
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

export default function MySchedulePage() {
  const { businessId } = useBusiness();
  const { user } = useAuth();

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!user) {
      setEmployeeId(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        const employeeForUserSnap = await getDocs(query(
          collection(db, "employees"),
          where("business_id", "==", businessId),
          where("profile_id", "==", user.id),
          limit(1),
        ));

        if (!employeeForUserSnap.empty) {
          if (!isCancelled) {
            setEmployeeId(employeeForUserSnap.docs[0].id);
          }
          return;
        }

        const fallbackSnap = await getDocs(query(
          collection(db, "employees"),
          where("business_id", "==", businessId),
          limit(1),
        ));

        if (!isCancelled) {
          const fallbackEmployeeId = fallbackSnap.empty ? null : fallbackSnap.docs[0].id;
          setEmployeeId(fallbackEmployeeId);
          if (!fallbackEmployeeId) {
            setLoading(false);
          }
        }
      } catch {
        if (!isCancelled) {
          setEmployeeId(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user, businessId]);

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

      const startUtc = parseISO(startAt);
      const endUtc = parseISO(endAt);
      const startParts = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(startUtc);
      const endParts = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(endUtc);
      const startHour = Number.parseInt(startParts.find((part) => part.type === "hour")?.value ?? "0", 10);
      const startMinute = Number.parseInt(startParts.find((part) => part.type === "minute")?.value ?? "0", 10);
      const endHour = Number.parseInt(endParts.find((part) => part.type === "hour")?.value ?? "0", 10);
      const endMinute = Number.parseInt(endParts.find((part) => part.type === "minute")?.value ?? "0", 10);

      const startLocal = new Date(startUtc);
      startLocal.setHours(startHour, startMinute, 0, 0);
      const endLocal = new Date(endUtc);
      endLocal.setHours(endHour, endMinute, 0, 0);

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

  const handleSelectEvent = (event: CalEvent) => {
    setSelectedEvent(event);
    setDetailModal(true);
  };

  const handleMarkCompleted = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);

    try {
      await updateDoc(doc(db, "appointments", selectedEvent.id), {
        status: "completed",
        updated_at: new Date().toISOString(),
      });

      toast.success("Rezervácia dokončená");
      setDetailModal(false);
      loadEvents();
    } catch {
      toast.error("Chyba pri aktualizácii");
    } finally {
      setUpdatingStatus(false);
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Môj rozvrh</h1>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

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
          eventPropGetter={(event: CalEvent) => ({ className: `status-${event.status}` })}
          step={30}
          timeslots={2}
          popup
          className="calendar-full-height"
        />
      </div>

      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail rezervácie</DialogTitle>
            <DialogDescription>
              Údaje o termíne a možnosť označiť službu ako dokončenú.
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
              {selectedEvent.status === "confirmed" && (
                <div className="pt-2 border-t border-border">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleMarkCompleted}
                    disabled={updatingStatus}
                  >
                    {updatingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Check className="w-3.5 h-3.5 mr-1" /> Označiť ako dokončenú
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

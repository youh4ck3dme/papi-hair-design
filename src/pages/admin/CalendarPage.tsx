import { useEffect, useState, useCallback } from "react";
import { addMinutes, startOfDay, addDays, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { BookingCalendar, statusToColor, type BookingCalendarEvent, type BookingCalendarMode, type SlotInfo } from "@/components/booking-calendar";

import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessInfoSupabase } from "@/integrations/supabase/useBusinessInfoSupabase";
import { generateSlots, type BusinessHours, type EmployeeSchedule, type ExistingAppointment } from "@/lib/availability";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const { info: businessInfo, loading: infoLoading } = useBusinessInfoSupabase(businessId);
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
    let query = supabase
      .from("appointments")
      .select("*, customers(*), services(*), employees(*)")
      .eq("business_id", businessId);

    if (!isOwnerOrAdmin) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: empId } = await supabase.rpc("get_employee_id", {
          _business_id: businessId,
          _user_id: userData.user.id
        });
        if (empId) {
          query = query.eq("employee_id", empId);
        }
      }
    }

    const { data, error } = await query.order("start_at");


    if (error) {
      console.error("CalendarPage: error loading events", error);
      setLoading(false);
      return;
    }

    const eventsList: CalEvent[] = (data ?? []).map((a: any) => ({
      id: a.id,
      title: `${a.customers?.full_name ?? "?"} – ${a.services?.name_sk ?? "?"}`,
      start: new Date(a.start_at),
      end: new Date(a.end_at),
      status: a.status,
      resource: a,
    }));

    setEvents(eventsList);
    setLoading(false);
  }, [businessId]);


  useEffect(() => {
    loadEvents();

    const loadData = async () => {
      const [bizRes, svcRes, empRes, memRes] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", businessId).single(),
        supabase.from("services").select("*").eq("business_id", businessId).eq("is_active", true),
        supabase.from("employees").select("*").eq("business_id", businessId).eq("is_active", true),
        supabase.from("memberships").select("*").eq("business_id", businessId)
      ]);

      if (svcRes.data) setServices(svcRes.data);
      if (empRes.data) {

        setEmployees(empRes.data);
        const ids = empRes.data.map((e: any) => e.id);
        if (ids.length) {
          const { data: scheds } = await supabase.from("schedules").select("*").in("employee_id", ids.slice(0, 10));
          const map: Record<string, EmployeeSchedule[]> = {};
          (scheds ?? []).forEach((s: any) => {
            const eid = s.employee_id;
            if (!map[eid]) map[eid] = [];
            map[eid].push({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time });
          });
          setSchedules(map);
        }
      }
      if (memRes.data) setMemberships(memRes.data as any);
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
        return membership.role === "employee";
      });
    }

    // Feature 5 extension: If NOT admin, show ONLY self in the selection (or filter has already done it)
    // Actually, on the public booking page, we hide non-bookable.
    // Here on the admin calendar, if I'm an employee, I should only be able to book for myself if I'm not an admin.
    return list;
  }, [employees, business, memberships]);


  const loadAvailableSlots = useCallback(async (slotDate: Date, employeeId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !employeeId || !business) return;

    const dayStart = startOfDay(slotDate);
    const dayEnd = addDays(dayStart, 1);

    let existing: { start_at: string; end_at: string }[] = [];
    const { data: appts } = await supabase
      .from("appointments")
      .select("start_at, end_at")
      .eq("employee_id", employeeId)
      .neq("status", "cancelled")
      .gte("start_at", dayStart.toISOString())
      .lt("start_at", dayEnd.toISOString());


    existing = (appts ?? []).map((a: any) => ({ start_at: a.start_at, end_at: a.end_at }));


    const slots = generateSlots({
      date: slotDate,
      serviceDuration: service.duration_minutes,
      serviceBuffer: service.buffer_minutes ?? 0,
      openingHours: (business.opening_hours ?? {}) as BusinessHours,
      employeeSchedules: schedules[employeeId] ?? [],
      existingAppointments: (existing ?? []) as ExistingAppointment[],
      leadTimeMinutes: 0, // Admin can book anytime
    });

    setAvailableSlots(slots);
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
    const employeeColor = (e.resource as any)?.employees?.color;
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
    const service = services.find((s) => s.id === bookForm.service_id);
    const duration = (service?.duration_minutes ?? 30) + (service?.buffer_minutes ?? 0);
    const start = new Date(bookForm.start_at);
    const end = addMinutes(start, duration);

    const walkinEmail = `walkin-${Date.now()}@internal`;

    // Check/Create internal customer
    const { data: custData } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .eq("email", walkinEmail)
      .maybeSingle();

    let customerId: string;
    if (custData) {
      customerId = custData.id;
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from("customers")
        .insert({
          business_id: businessId,
          full_name: "Zákazník (osobne)",
          email: walkinEmail,
        })
        .select("id")
        .single();

      if (custErr) {
        toast.error("Chyba pri vytváraní zákazníka");
        setSaving(false);
        return;
      }
      customerId = newCust.id;
    }

    const { error: apptErr } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        employee_id: bookForm.employee_id,
        service_id: bookForm.service_id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "confirmed",
      });

    if (apptErr) {
      toast.error("Chyba pri vytváraní rezervácie");
    } else {
      toast.success("Rezervácia vytvorená");
      setBookingModal(false);
      loadEvents();
    }
    setSaving(false);

  };

  const handleStatusChange = async (newStatus: "pending" | "confirmed" | "cancelled" | "completed") => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);

    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", selectedEvent.id);

    if (error) {
      toast.error("Chyba pri aktualizácii");
    } else {
      toast.success("Status aktualizovaný");
      setDetailModal(false);
      loadEvents();
    }
    setUpdatingStatus(false);
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
          <DialogHeader><DialogTitle>Nová rezervácia</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle>Detail rezervácie</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <Badge className="text-xs border-0 bg-secondary text-secondary-foreground">
                {STATUS_LABELS[selectedEvent.status]}
              </Badge>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">
                    {selectedEvent.resource?.customers?.full_name ?? selectedEvent.title}
                  </span>
                </div>
                {selectedEvent.resource?.customers?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedEvent.resource.customers.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <LogoIcon size="sm" className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {selectedEvent.resource?.services?.name_sk && selectedEvent.resource?.employees?.display_name
                      ? `${selectedEvent.resource.services.name_sk} · ${selectedEvent.resource.employees.display_name}`
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

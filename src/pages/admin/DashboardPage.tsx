import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  CheckCircle,
  History,
  Mail as MailIcon,
  Phone as PhoneIcon,
  Plus,
  Loader2,
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { sk } from "date-fns/locale";
import { createPublicBooking } from "@/integrations/firebase/createPublicBooking";
import { toast } from "sonner";
import { ADMIN_BOOKING_STATUS_LABELS } from "@/lib/adminBookingStatus";
import { useTranslation } from "react-i18next";
import {
  isBlockedByClientError,
  isIgnorableBlockedFirestoreError,
  warnBlockedByClientOnce,
} from "@/lib/firebaseClientErrors";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: ADMIN_BOOKING_STATUS_LABELS.pending, className: "bg-amber-100 text-amber-800" },
  confirmed: { label: ADMIN_BOOKING_STATUS_LABELS.confirmed, className: "bg-green-100 text-green-800" },
  cancelled: { label: ADMIN_BOOKING_STATUS_LABELS.cancelled, className: "bg-red-100 text-red-800" },
  completed: { label: ADMIN_BOOKING_STATUS_LABELS.completed, className: "bg-slate-100 text-slate-700" },
  no_show: { label: ADMIN_BOOKING_STATUS_LABELS.no_show, className: "bg-rose-100 text-rose-800" },
};

interface AppointmentCardRow {
  id: string;
  start_at: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string | null;
  employee_name: string | null;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { businessId } = useBusiness();
  const [stats, setStats] = useState({ today: 0, total: 0, employees: 0, services: 0 });
  const [todayAppointments, setTodayAppointments] = useState<AppointmentCardRow[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name_sk?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [newBookingForm, setNewBookingForm] = useState({
    service_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    date: "",
    time: "",
    note: "",
    payment_method: "cash",
  });

  const loadStats = useCallback(async () => {
    if (!businessId) {
      return;
    }

    setLoading(true);
    setError(null);
    const today = new Date();
    const startIso = startOfDay(today).toISOString();
    const endIso = endOfDay(today).toISOString();

    try {
      const [allApptsSnap, employeesSnap, servicesSnap, todaySnap] = await Promise.all([
        getDocs(query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
        )),
        getDocs(query(
          collection(db, "employees"),
          where("business_id", "==", businessId),
          where("is_active", "==", true),
        )),
        getDocs(query(
          collection(db, "services"),
          where("business_id", "==", businessId),
          where("is_active", "==", true),
        )),
        getDocs(query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
          where("start_at", ">=", startIso),
          where("start_at", "<=", endIso),
          orderBy("start_at"),
        )),
      ]);

      const totalNonCancelled = allApptsSnap.docs.reduce((count, docSnap) => {
        const appointment = docSnap.data() as { status?: string };
        return appointment.status === "cancelled" ? count : count + 1;
      }, 0);

      setStats({
        today: todaySnap.size,
        total: totalNonCancelled,
        employees: employeesSnap.size,
        services: servicesSnap.size,
      });

      setTodayAppointments(todaySnap.docs.map((docSnap) => {
        const appointment = docSnap.data() as {
          start_at?: string;
          status?: string;
          customer_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          service_name?: string | null;
          employee_name?: string | null;
        };

        return {
          id: docSnap.id,
          start_at: appointment.start_at ?? "",
          status: appointment.status ?? "pending",
          customer_name: appointment.customer_name ?? null,
          customer_email: appointment.customer_email ?? null,
          customer_phone: appointment.customer_phone ?? null,
          service_name: appointment.service_name ?? null,
          employee_name: appointment.employee_name ?? null,
        };
      }));

      setServices(servicesSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as { name_sk?: string | null }),
      })));
    } catch (err) {
      if (isIgnorableBlockedFirestoreError(err) || isBlockedByClientError(err)) {
        warnBlockedByClientOnce((message) => toast.warning(message));
        console.warn("DashboardPage: non-critical blocked request", err);
        setError("Načítanie je obmedzené blokovaním požiadaviek v prehliadači.");
      } else {
        console.error("DashboardPage: Unable to load stats", err);
        setError("Nepodarilo sa načítať údaje");
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await loadStats();
    })();
    return () => {
      active = false;
    };
  }, [loadStats]);

  const handleCreateBooking = async () => {
    if (
      !newBookingForm.service_id ||
      !newBookingForm.customer_name ||
      !newBookingForm.customer_email ||
      !newBookingForm.date ||
      !newBookingForm.time
    ) {
      toast.error("Vyplňte všetky povinné polia");
      return;
    }

    const start = new Date(`${newBookingForm.date}T${newBookingForm.time}`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Neplatný dátum alebo čas");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(newBookingForm.time)) {
      toast.error(t("admin.newBookingTimeInvalid"));
      return;
    }

    setCreatingBooking(true);
    try {
      const result = await createPublicBooking({
        business_id: businessId,
        service_id: newBookingForm.service_id,
        start_at: start.toISOString(),
        customer_name: newBookingForm.customer_name,
        customer_email: newBookingForm.customer_email,
        customer_phone: newBookingForm.customer_phone || undefined,
        note: newBookingForm.note || null,
        payment_method: newBookingForm.payment_method,
        admin_mode: true,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(t("admin.newBookingSuccess"));
      setNewBookingOpen(false);
      setNewBookingForm({
        service_id: "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        date: "",
        time: "",
        note: "",
        payment_method: "cash",
      });
      await loadStats();
    } catch (err) {
      console.error("DashboardPage: create booking failed", err);
      toast.error("Rezerváciu sa nepodarilo vytvoriť");
    } finally {
      setCreatingBooking(false);
    }
  };

  const statCards = [
    { title: "Dnes", value: stats.today, icon: Calendar, color: "text-red-600", bg: "bg-red-500/10" },
    { title: "Celkovo", value: stats.total, icon: TrendingUp, color: "text-red-600", bg: "bg-red-500/10" },
    { title: "Tím", value: stats.employees, icon: Users, color: "text-red-600", bg: "bg-red-500/10" },
    { title: "Arsenal", value: stats.services, icon: Briefcase, color: "text-red-600", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prehľad</h1>
        <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: sk })}</p>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setNewBookingOpen(true)}
          className="rounded-full bg-primary px-4 text-primary-foreground shadow-[0_16px_40px_-24px_rgba(0,0,0,0.45)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.newBooking")}
        </Button>
      </div>

      <div
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/80 px-5 py-5 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.5)] backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">História rezervácií</p>
            <p className="text-lg font-semibold text-foreground">Magic-link + referencia pre klientov</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
          Klienti si bez prihlásenia otvoria svoju históriu cez e-mailový odkaz, prípadne zadajú referenciu + e-mail/telefón.
          Všetky detaily sú potom dostupné aj pre admina v dashboarde.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/dashboard/history"
            className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary hover:border-primary"
          >
            <History className="w-4 h-4" />
            Otvoriť anonymnú históriu
          </a>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Magic link + fallback</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-b-4 border-black pb-2">
        <div className="font-black text-sm text-black uppercase tracking-[0.3em]">System Telemetry</div>
        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          className="text-xs font-black uppercase text-red-600 hover:underline disabled:opacity-40"
        >
          {loading ? "Načítavam..." : "Re-Sync"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-4 border-black">
        {statCards.map((card) => (
          <Card key={card.title} className="rounded-none border-0 border-r-4 last:border-r-0 border-black shadow-none bg-white hover:bg-red-50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-black font-black uppercase tracking-widest">{card.title}</p>
                  <p className="text-4xl font-black text-black mt-1 leading-none">{card.value}</p>
                </div>
                <div className={`w-12 h-12 border-4 border-black ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} strokeWidth={3} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Dnešné rezervácie
          </CardTitle>
        </CardHeader>
        {error && (
          <CardContent className="rounded-b-2xl border-t border-primary/10 bg-rose-50/70 text-rose-700">
            {error}
          </CardContent>
        )}
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Dnes nie sú žiadne rezervácie</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((appointment) => {
                const status = STATUS_LABELS[appointment.status] ?? STATUS_LABELS.pending;
                return (
                  <div key={appointment.id} className="rounded-lg bg-muted/40 p-3 transition-colors hover:bg-muted/70">
                    <div className="flex items-start gap-3">
                      <div className="text-sm font-mono font-semibold text-foreground w-12 flex-shrink-0">
                      {appointment.start_at ? format(new Date(appointment.start_at), "HH:mm") : "—"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{appointment.customer_name ?? "Zákazník"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {appointment.service_name ?? "Služba"} · {appointment.employee_name ?? "Pracovník"}
                        </p>
                        {(appointment.customer_email || appointment.customer_phone) && (
                          <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                            {appointment.customer_email && (
                              <div className="flex items-center gap-2">
                                <MailIcon className="w-3.5 h-3.5 text-primary" />
                                <span className="truncate">{appointment.customer_email}</span>
                              </div>
                            )}
                            {appointment.customer_phone && (
                              <div className="flex items-center gap-2">
                                <PhoneIcon className="w-3.5 h-3.5 text-primary" />
                                <span>{appointment.customer_phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge className={`text-xs ${status.className} border-0`}>{status.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={newBookingOpen} onOpenChange={setNewBookingOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto px-5 py-5 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("admin.newBookingDialogTitle")}</SheetTitle>
            <SheetDescription>
              {t("admin.newBookingDialogDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("booking.confirmService")}</Label>
              <Select
                value={newBookingForm.service_id}
                onValueChange={(value) => setNewBookingForm((current) => ({ ...current, service_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.newBookingSelectService")} />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name_sk ?? "Služba"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("admin.newBookingName")}</Label>
              <Input
                value={newBookingForm.customer_name}
                onChange={(event) => setNewBookingForm((current) => ({ ...current, customer_name: event.target.value }))}
                placeholder={t("admin.newBookingNamePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("history.emailField")}</Label>
              <Input
                type="email"
                value={newBookingForm.customer_email}
                onChange={(event) => setNewBookingForm((current) => ({ ...current, customer_email: event.target.value }))}
                placeholder={t("history.emailPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("history.phoneField")}</Label>
              <Input
                value={newBookingForm.customer_phone}
                onChange={(event) => setNewBookingForm((current) => ({ ...current, customer_phone: event.target.value }))}
                placeholder={t("history.phonePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.newBookingDate")}</Label>
              <Input
                type="date"
                value={newBookingForm.date}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(event) => setNewBookingForm((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.newBookingTime")}</Label>
              <Input
                type="text"
                value={newBookingForm.time}
                placeholder="HH:mm"
                onChange={(event) => setNewBookingForm((current) => ({ ...current, time: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("admin.newBookingNotes")}</Label>
              <Textarea
                value={newBookingForm.note}
                onChange={(event) => setNewBookingForm((current) => ({ ...current, note: event.target.value }))}
                placeholder={t("admin.newBookingNotesPlaceholder")}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("admin.newBookingPayment")}</Label>
              <Input value={newBookingForm.payment_method} disabled />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setNewBookingOpen(false)} disabled={creatingBooking}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleCreateBooking} disabled={creatingBooking}>
              {creatingBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("admin.newBookingSubmit")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

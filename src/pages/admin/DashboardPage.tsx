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
  pending: { label: ADMIN_BOOKING_STATUS_LABELS.pending, className: "border border-amber-500/30 bg-amber-500/12 text-amber-300" },
  confirmed: { label: ADMIN_BOOKING_STATUS_LABELS.confirmed, className: "border border-emerald-500/30 bg-emerald-500/12 text-emerald-300" },
  cancelled: { label: ADMIN_BOOKING_STATUS_LABELS.cancelled, className: "border border-red-500/30 bg-red-500/12 text-red-300" },
  completed: { label: ADMIN_BOOKING_STATUS_LABELS.completed, className: "border border-slate-400/30 bg-slate-400/12 text-slate-200" },
  no_show: { label: ADMIN_BOOKING_STATUS_LABELS.no_show, className: "border border-rose-500/30 bg-rose-500/12 text-rose-300" },
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
    { title: "Dnes", value: stats.today, icon: Calendar, accent: "border-primary/45 bg-primary/14 text-primary" },
    { title: "Celkovo", value: stats.total, icon: TrendingUp, accent: "border-sky-500/40 bg-sky-500/12 text-sky-300" },
    { title: "Tím", value: stats.employees, icon: Users, accent: "border-violet-500/40 bg-violet-500/12 text-violet-300" },
    { title: "Arsenal", value: stats.services, icon: Briefcase, accent: "border-rose-500/40 bg-rose-500/12 text-rose-300" },
  ];

  return (
    <div className="space-y-6 lg:space-y-7" data-testid="dashboard">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Prehľad</h1>
          <p className="mt-1 text-sm text-muted-foreground">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: sk })}</p>
        </div>
        <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
          Admin Dashboard
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setNewBookingOpen(true)}
          className="rounded-full border border-primary/45 bg-[linear-gradient(180deg,rgba(218,165,32,0.22),rgba(218,165,32,0.09))] px-5 text-primary shadow-[0_16px_40px_-24px_rgba(218,165,32,0.45)] hover:bg-[linear-gradient(180deg,rgba(218,165,32,0.3),rgba(218,165,32,0.12))]"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.newBooking")}
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-[linear-gradient(130deg,rgba(11,11,11,0.92),rgba(22,22,22,0.86))] px-5 py-5 shadow-[0_30px_80px_-55px_rgba(0,0,0,0.75)] backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-primary/8 blur-3xl" />
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
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Magic link + fallback
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">System Telemetry</div>
        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-primary transition hover:text-primary/80 disabled:opacity-40"
        >
          {loading ? "Načítavam..." : "Obnoviť"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="group rounded-2xl border border-border/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{card.title}</p>
                  <p className="mt-1 text-4xl font-black leading-none text-foreground">{card.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${card.accent}`}>
                  <card.icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/85 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Dnešné rezervácie
          </CardTitle>
        </CardHeader>
        {error && (
          <CardContent className="rounded-b-2xl border-t border-rose-500/30 bg-rose-500/12 text-rose-300">
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
                  <div key={appointment.id} className="rounded-xl border border-border/50 bg-background/35 p-3 transition-all hover:border-primary/25 hover:bg-background/60">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/60 text-sm font-mono font-semibold text-foreground">
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
                      <Badge className={`text-xs font-semibold ${status.className}`}>{status.label}</Badge>
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

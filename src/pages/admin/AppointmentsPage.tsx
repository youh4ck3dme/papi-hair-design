import { useEffect, useState } from "react";
import { db } from "@/integrations/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  orderBy,
  updateDoc,
  Timestamp,
  limit
} from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Search, Check, X, Clock, User, Calendar, ExternalLink, CalendarDays, ReceiptEuro, UserPlus, Scissors, ChevronRight, Copy, Mail, Phone } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { adminUpdateBookingStatus } from "@/integrations/firebase/adminUpdateBookingStatus";
import {
  ADMIN_BOOKING_STATUS_BADGES,
  ADMIN_BOOKING_STATUS_LABELS,
  canAdminCancelBooking,
  canAdminCompleteBooking,
  canAdminConfirmBooking,
  canAdminMarkNoShow,
} from "@/lib/adminBookingStatus";

const STATUS_MAP: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: ADMIN_BOOKING_STATUS_LABELS.pending, className: ADMIN_BOOKING_STATUS_BADGES.pending, icon: Clock },
  confirmed: { label: ADMIN_BOOKING_STATUS_LABELS.confirmed, className: ADMIN_BOOKING_STATUS_BADGES.confirmed, icon: Check },
  cancelled: { label: ADMIN_BOOKING_STATUS_LABELS.cancelled, className: ADMIN_BOOKING_STATUS_BADGES.cancelled, icon: X },
  completed: { label: ADMIN_BOOKING_STATUS_LABELS.completed, className: ADMIN_BOOKING_STATUS_BADGES.completed, icon: CalendarDays },
  no_show: { label: ADMIN_BOOKING_STATUS_LABELS.no_show, className: ADMIN_BOOKING_STATUS_BADGES.no_show, icon: X },
};

export default function AppointmentsPage() {
  const { businessId, isOwnerOrAdmin, role } = useBusiness();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Skopírovať");
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeResolved, setEmployeeResolved] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const resolveEmployeeForViewer = async () => {
      if (!businessId) {
        setEmployeeId(null);
        setEmployeeResolved(false);
        return;
      }

      if (isOwnerOrAdmin || role !== "employee") {
        setEmployeeId(null);
        setEmployeeResolved(true);
        return;
      }

      if (!user?.id) {
        setEmployeeId(null);
        setEmployeeResolved(true);
        return;
      }

      setLoading(true);
      setEmployeeResolved(false);

      try {
        const employeeSnap = await getDocs(
          query(
            collection(db, "employees"),
            where("business_id", "==", businessId),
            where("profile_id", "==", user.id),
            limit(1)
          )
        );

        if (isCancelled) return;
        setEmployeeId(employeeSnap.empty ? null : employeeSnap.docs[0].id);
      } catch (err) {
        console.error("AppointmentsPage: error resolving employee mapping", err);
        if (!isCancelled) {
          setEmployeeId(null);
        }
      } finally {
        if (!isCancelled) {
          setEmployeeResolved(true);
        }
      }
    };

    resolveEmployeeForViewer();

    return () => {
      isCancelled = true;
    };
  }, [businessId, isOwnerOrAdmin, role, user?.id]);

  const load = async () => {
    if (!businessId) return;
    if (role === "employee" && !employeeResolved) return;

    if (role === "employee" && !employeeId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const statuses = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;
      type AppStatus = typeof statuses[number];

      let q = query(
        collection(db, "appointments"),
        where("business_id", "==", businessId),
        orderBy("start_at", "desc"),
        limit(100)
      );

      if (role === "employee") {
        q = query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
          where("employee_id", "==", employeeId),
          orderBy("start_at", "desc"),
          limit(100)
        );
      } else if (statusFilter !== "all" && statuses.includes(statusFilter as AppStatus)) {
        q = query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
          where("status", "==", statusFilter),
          orderBy("start_at", "desc"),
          limit(100)
        );
      }

      const snap = await getDocs(q);
      const loadedAppointments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filteredByStatus =
        statusFilter !== "all" && role === "employee" && statuses.includes(statusFilter as AppStatus)
          ? loadedAppointments.filter((entry) => entry.status === statusFilter)
          : loadedAppointments;

      setAppointments(filteredByStatus);
    } catch (err) {
      console.error("AppointmentsPage: error loading data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [businessId, statusFilter, role, employeeId, employeeResolved]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show") => {
    setUpdating(true);
    try {
      await adminUpdateBookingStatus({
        business_id: businessId,
        appointment_id: id,
        status,
      });
      toast.success("Status aktualizovaný");
      setSelected(null);
      load();
    } catch (err) {
      console.error("updateStatus error:", err);
      toast.error("Chyba pri aktualizácii");
    } finally {
      setUpdating(false);
    }
  };

  const filtered = appointments.filter((a) => {
    const name = (a.customer_name ?? "").toLowerCase();
    const svc = (a.service_name ?? "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || svc.includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Rezervácie
          </h1>
          <p className="text-muted-foreground">Prehľad všetkých prijatých a uskutočnených termínov.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 bg-background/50 border-primary/10 w-full sm:w-64 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl"
              placeholder="Meno alebo služba..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-background/50 border-primary/10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/20 backdrop-blur-xl">
              <SelectItem value="all">Všetky</SelectItem>
              <SelectItem value="pending">Čakajúce</SelectItem>
              <SelectItem value="confirmed">Potvrdené</SelectItem>
              <SelectItem value="completed">Dokončené</SelectItem>
              <SelectItem value="no_show">No-show</SelectItem>
              <SelectItem value="cancelled">Zrušené</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground animate-pulse">Spracúvam rezervácie...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-primary/20 rounded-3xl bg-card/20">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-primary/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Žiadne rezervácie</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
            Zatiaľ neboli nájdené žiadne záznamy pre dané filtre.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => {
            const statusConfig = STATUS_MAP[a.status] ?? STATUS_MAP.pending;
            const StatusIcon = statusConfig.icon;
            const startDate = a.start_at instanceof Timestamp ? a.start_at.toDate() : new Date(a.start_at);

            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="group relative w-full text-left flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border border-primary/10 bg-card/40 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30"
              >
                <div className="flex items-center gap-4 min-w-[120px]">
                  <div className="bg-primary/5 p-2 rounded-xl text-center min-w-[60px] group-hover:bg-primary/10 transition-colors">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{format(startDate, "MMM", { locale: sk })}</p>
                    <p className="text-xl font-bold text-foreground leading-none">{format(startDate, "dd")}</p>
                  </div>
                  <div className="md:hidden flex-1">
                    <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{a.customer_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{format(startDate, "HH:mm")}</span>
                    </div>
                    {(a.customer_email || a.customer_phone) && (
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {a.customer_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {a.customer_email}
                          </span>
                        )}
                        {a.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {a.customer_phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden md:block flex-shrink-0">
                  <p className="text-xl font-bold text-foreground">{format(startDate, "HH:mm")}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Čas termínu</p>
                </div>

                <Separator orientation="vertical" className="hidden md:block h-10 bg-primary/10" />

                <div className="flex-1 min-w-0">
                  <div className="hidden md:block">
                    <p className="font-bold text-lg text-foreground group-hover:text-primary transition-all truncate">{a.customer_name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Scissors className="w-3 h-3 opacity-60" />
                      <span>{a.service_name}</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1 text-primary/70">
                      <User className="w-3 h-3 opacity-60" />
                      <span>{a.employee_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 mt-2 md:mt-0 flex-shrink-0">
                  {a.service_price != null && (
                    <div className="flex items-center gap-1 font-bold text-foreground">
                      <ReceiptEuro className="w-4 h-4 text-emerald-500/70" />
                      <span>{a.service_price}€</span>
                    </div>
                  )}
                  <Badge className={cn("px-3 py-1 rounded-full border text-[10px] flex items-center gap-1.5 shadow-sm", statusConfig.className)}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </Badge>
                  <ChevronRight className="hidden md:block w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              Detail rezervácie
            </DialogTitle>
            <DialogDescription>
              Prehľad detailov termínu a správa stavu.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/5">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">{selected.customer_name}</h4>
                  <div className="flex gap-2">
                    {selected.customer_phone && <span className="text-xs text-muted-foreground">{selected.customer_phone}</span>}
                    {selected.customer_email && <span className="text-xs text-muted-foreground">· {selected.customer_email}</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Referencia</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" title={selected.id}>{selected.id}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(selected.id);
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
                      href={`/dashboard/history?ref=${encodeURIComponent(selected.id)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> História
                    </a>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Kontakt</Label>
                  <div className="flex flex-col gap-1 text-sm text-foreground">
                    {selected.customer_email && <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-primary" /> {selected.customer_email}</span>}
                    {selected.customer_phone && <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-primary" /> {selected.customer_phone}</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Služba</Label>
                  <p className="text-sm font-semibold">{selected.service_name}</p>
                  {selected.service_price && <p className="text-xs text-emerald-600 font-bold">{selected.service_price} €</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Člen tímu</Label>
                  <p className="text-sm font-semibold text-primary">{selected.employee_name}</p>
                </div>
              </div>

              <Separator className="bg-primary/5" />

              <div className="flex items-center gap-3">
                <div className="w-2 h-10 bg-primary/20 rounded-full" />
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Dátum a čas</Label>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {format(selected.start_at instanceof Timestamp ? selected.start_at.toDate() : new Date(selected.start_at), "d. MMMM yyyy", { locale: sk })}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    {format(selected.start_at instanceof Timestamp ? selected.start_at.toDate() : new Date(selected.start_at), "HH:mm")} – {format(selected.end_at instanceof Timestamp ? selected.end_at.toDate() : new Date(selected.end_at), "HH:mm")}
                  </p>
                </div>
              </div>

              {isOwnerOrAdmin && (
                <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-primary/5">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {canAdminConfirmBooking(selected.status) && (
                      <Button className="font-bold rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(selected.id, "confirmed")} disabled={updating}>
                        <Check className="w-4 h-4 mr-2" /> Potvrdiť
                      </Button>
                    )}
                    {canAdminCompleteBooking(selected.status) && (
                      <Button variant="secondary" className="font-bold rounded-xl" onClick={() => updateStatus(selected.id, "completed")} disabled={updating}>
                        Služba hotová
                      </Button>
                    )}
                    {canAdminMarkNoShow(selected.status) && (
                      <Button variant="destructive" className="font-bold rounded-xl" onClick={() => updateStatus(selected.id, "no_show")} disabled={updating}>
                        <X className="w-4 h-4 mr-2" /> No-show
                      </Button>
                    )}
                    {canAdminCancelBooking(selected.status) && (
                      <Button variant="ghost" className="font-bold rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50/50" onClick={() => updateStatus(selected.id, "cancelled")} disabled={updating}>
                        <X className="w-4 h-4 mr-2" /> Zrušiť
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

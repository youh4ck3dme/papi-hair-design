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
  Timestamp
} from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Search, Check, X, Clock, User } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Čaká", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Potvrdená", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Zrušená", className: "bg-red-100 text-red-800" },
  completed: { label: "Dokončená", className: "bg-slate-100 text-slate-700" },
};

export default function AppointmentsPage() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const statuses = ["pending", "confirmed", "cancelled", "completed"] as const;
      type AppStatus = typeof statuses[number];

      let q = query(
        collection(db, "appointments"),
        where("business_id", "==", businessId),
        orderBy("start_at", "desc")
      );

      if (statusFilter !== "all" && statuses.includes(statusFilter as AppStatus)) {
        // Redefine query with filter
        q = query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
          where("status", "==", statusFilter),
          orderBy("start_at", "desc")
        );
      }

      const snap = await getDocs(q);
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("AppointmentsPage: error loading data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [businessId, statusFilter]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "cancelled" | "completed") => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "appointments", id), {
        status,
        updated_at: new Date().toISOString()
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Rezervácie</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Hľadať..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky</SelectItem>
              <SelectItem value="pending">Čakajúce</SelectItem>
              <SelectItem value="confirmed">Potvrdené</SelectItem>
              <SelectItem value="completed">Dokončené</SelectItem>
              <SelectItem value="cancelled">Zrušené</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Žiadne rezervácie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const s = STATUS_MAP[a.status] ?? STATUS_MAP.pending;
            const startDate = a.start_at instanceof Timestamp ? a.start_at.toDate() : new Date(a.start_at);
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:border-primary/30 transition-all"
              >
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{format(startDate, "d. M.", { locale: sk })}</p>
                  <p className="text-sm font-bold text-foreground">{format(startDate, "HH:mm")}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.service_name} · {a.employee_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.service_price && <span className="text-sm font-medium text-foreground">{a.service_price}€</span>}
                  <Badge className={`text-xs border-0 ${s.className}`}>{s.label}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Rezervácia</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selected.customer_name}</span>
                </div>
                {selected.customer_email && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-muted-foreground text-center">@</span>
                    <span>{selected.customer_email}</span>
                  </div>
                )}
                {selected.customer_phone && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-muted-foreground">📞</span>
                    <span>{selected.customer_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <LogoIcon size="sm" className="w-4 h-4" />
                  <span>{selected.service_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {format(selected.start_at instanceof Timestamp ? selected.start_at.toDate() : new Date(selected.start_at), "d. MMMM yyyy HH:mm", { locale: sk })} – {format(selected.end_at instanceof Timestamp ? selected.end_at.toDate() : new Date(selected.end_at), "HH:mm")}
                  </span>
                </div>
              </div>

              {isOwnerOrAdmin && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  {selected.status === "pending" && (
                    <Button size="sm" className="flex-1" onClick={() => updateStatus(selected.id, "confirmed")} disabled={updating}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Potvrdiť
                    </Button>
                  )}
                  {(selected.status === "confirmed" || selected.status === "pending") && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => updateStatus(selected.id, "completed")} disabled={updating}>
                      Dokončiť
                    </Button>
                  )}
                  {selected.status !== "cancelled" && selected.status !== "completed" && (
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "cancelled")} disabled={updating}>
                      <X className="w-3.5 h-3.5 mr-1" /> Zrušiť
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

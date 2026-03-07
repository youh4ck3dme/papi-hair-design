import { useEffect, useState } from "react";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface CustomerRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  visits: number;
  lastVisitAt: string | null;
}

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [customerSnap, appointmentSnap] = await Promise.all([
        getDocs(query(
          collection(db, "customers"),
          where("business_id", "==", businessId),
        )),
        getDocs(query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
        )),
      ]);

      const statsByCustomerId = new Map<string, { visits: number; lastVisitAt: string | null }>();
      appointmentSnap.docs.forEach((docSnap) => {
        const appointment = docSnap.data() as { customer_id?: string; start_at?: string };
        if (!appointment.customer_id) {
          return;
        }

        const current = statsByCustomerId.get(appointment.customer_id) ?? { visits: 0, lastVisitAt: null };
        const nextVisits = current.visits + 1;
        const nextLastVisit = (() => {
          if (!appointment.start_at) {
            return current.lastVisitAt;
          }
          if (!current.lastVisitAt) {
            return appointment.start_at;
          }
          return appointment.start_at > current.lastVisitAt ? appointment.start_at : current.lastVisitAt;
        })();

        statsByCustomerId.set(appointment.customer_id, { visits: nextVisits, lastVisitAt: nextLastVisit });
      });

      const loadedCustomers = customerSnap.docs
        .map((docSnap) => {
          const customer = docSnap.data() as { full_name?: string; email?: string | null; phone?: string | null };
          const stats = statsByCustomerId.get(docSnap.id) ?? { visits: 0, lastVisitAt: null };

          return {
            id: docSnap.id,
            full_name: customer.full_name ?? "",
            email: customer.email ?? null,
            phone: customer.phone ?? null,
            visits: stats.visits,
            lastVisitAt: stats.lastVisitAt,
          };
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "sk"));

      setCustomers(loadedCustomers);
      setLoading(false);
    };

    load();
  }, [businessId]);

  const filtered = customers.filter((customer) => {
    const queryTerm = search.toLowerCase();
    return customer.full_name.toLowerCase().includes(queryTerm)
      || customer.email?.toLowerCase().includes(queryTerm)
      || customer.phone?.includes(queryTerm);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Zákazníci</h1>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 w-52" placeholder="Hľadať..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Žiadni zákazníci</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <div key={customer.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <span className="text-secondary-foreground font-semibold text-sm">
                  {customer.full_name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{customer.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {customer.email}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{customer.visits} návšt.</p>
                {customer.lastVisitAt && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(customer.lastVisitAt), "d. M. yyyy", { locale: sk })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

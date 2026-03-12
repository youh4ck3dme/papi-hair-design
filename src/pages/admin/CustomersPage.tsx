import { useEffect, useState } from "react";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserCheck, ArrowUpDown, MoreHorizontal, Mail, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CustomerRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  visits: number;
  lastVisitAt: string | null;
}

type SortConfig = {
  key: keyof CustomerRow;
  direction: "asc" | "desc";
};

interface CustomerHistoryRow {
  id: string;
  service_name: string | null;
  employee_name: string | null;
  status: string | null;
  start_at: string | null;
}

const STATUS_BADGE_CLASSNAME: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  completed: "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Čaká",
  confirmed: "Potvrdená",
  cancelled: "Zrušená",
  completed: "Dokončená",
};

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "full_name", direction: "asc" });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!businessId) return;
      setLoading(true);

      try {
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
          if (!appointment.customer_id) return;

          const current = statsByCustomerId.get(appointment.customer_id) ?? { visits: 0, lastVisitAt: null };
          const nextVisits = current.visits + 1;
          const nextLastVisit = (() => {
            if (!appointment.start_at) return current.lastVisitAt;
            if (!current.lastVisitAt) return appointment.start_at;
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
              full_name: customer.full_name ?? "Neznámy zákazník",
              email: customer.email ?? null,
              phone: customer.phone ?? null,
              visits: stats.visits,
              lastVisitAt: stats.lastVisitAt,
            };
          });

        setCustomers(loadedCustomers);
      } catch (error) {
        console.error("CustomersPage: error loading data", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId]);

  const handleSort = (key: keyof CustomerRow) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const openCustomerHistory = async (customer: CustomerRow) => {
    if (!businessId) return;

    setSelectedCustomer(customer);
    setCustomerHistory([]);
    setHistoryLoading(true);

    try {
      const historySnap = await getDocs(query(
        collection(db, "appointments"),
        where("business_id", "==", businessId),
        where("customer_id", "==", customer.id),
        orderBy("start_at", "desc"),
        limit(20),
      ));

      setCustomerHistory(historySnap.docs.map((docSnap) => {
        const appointment = docSnap.data() as {
          service_name?: string | null;
          employee_name?: string | null;
          status?: string | null;
          start_at?: string | null;
        };

        return {
          id: docSnap.id,
          service_name: appointment.service_name ?? null,
          employee_name: appointment.employee_name ?? null,
          status: appointment.status ?? null,
          start_at: appointment.start_at ?? null,
        };
      }));
    } catch (error) {
      console.error("CustomersPage: error loading customer history", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredAndSorted = customers
    .filter((customer) => {
      const queryTerm = search.toLowerCase();
      return (
        customer.full_name.toLowerCase().includes(queryTerm) ||
        (customer.email?.toLowerCase().includes(queryTerm) ?? false) ||
        (customer.phone?.includes(queryTerm) ?? false)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue, "sk")
          : bValue.localeCompare(aValue, "sk");
      }

      return sortConfig.direction === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Zákazníci
          </h1>
          <p className="text-muted-foreground">Správa a štatistiky vašich klientov.</p>
        </div>
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            className="pl-9 w-full sm:w-64 bg-card/50 border-primary/10 transition-all focus:ring-primary/20" 
            placeholder="Hľadať zákazníka..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-primary/5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
            <p className="text-sm text-muted-foreground animate-pulse">Načítavam zákazníkov...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-primary/30" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Žiadni zákazníci</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
              {search ? "Skúste zmeniť kritériá vyhľadávania." : "Zatiaľ nemáte žiadnych evidovaných zákazníkov."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-primary/5 text-xs uppercase tracking-wider font-semibold">
                  <TableHead className="w-[300px]">
                    <Button variant="ghost" onClick={() => handleSort("full_name")} className="hover:bg-transparent p-0 h-auto flex items-center gap-1 font-semibold text-[10px]">
                      Zákazník <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-[10px]">Kontakt</TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort("visits")} className="hover:bg-transparent p-0 h-auto flex items-center gap-1 mx-auto font-semibold text-[10px]">
                      Návštevy <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => handleSort("lastVisitAt")} className="hover:bg-transparent p-0 h-auto flex items-center gap-1 ml-auto font-semibold text-[10px]">
                      Posledná návšteva <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-primary/5 border-primary/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-inner group-hover:scale-110 transition-transform">
                          <span className="text-primary font-bold text-xs">
                            {customer.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{customer.full_name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ID: {customer.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 text-primary/40" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 text-primary/40" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-medium">
                        {customer.visits}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {customer.lastVisitAt ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium">{format(new Date(customer.lastVisitAt), "d. M. yyyy", { locale: sk })}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">{format(new Date(customer.lastVisitAt), "EEEE · HH:mm", { locale: sk })}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-lg border-primary/10">
                          <DropdownMenuLabel>Akcie</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => void openCustomerHistory(customer)}>
                            <Calendar className="w-4 h-4 opacity-70" /> História rezervácií
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-primary/5" />
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive gap-2">
                            Zmazať zákazníka
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg border-primary/15 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">História zákazníka</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.full_name ?? "Zákazník"} · {selectedCustomer?.email ?? "bez e-mailu"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCustomer && (
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedCustomer.full_name}</p>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                      {selectedCustomer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-primary/60" />
                          <span className="truncate">{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-primary/60" />
                          <span>{selectedCustomer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-primary/15">
                    {selectedCustomer.visits} rezervácií
                  </Badge>
                </div>
              </div>
            )}

            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
              </div>
            ) : customerHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/15 p-8 text-center text-sm text-muted-foreground">
                Pre tohto zákazníka zatiaľ neevidujeme žiadnu históriu rezervácií.
              </div>
            ) : (
              <div className="space-y-3">
                {customerHistory.map((appointment) => {
                  const status = appointment.status ?? "pending";
                  return (
                    <div key={appointment.id} className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {appointment.service_name ?? "Služba"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {appointment.employee_name ?? "Pridelený tím"}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            {appointment.start_at
                              ? format(new Date(appointment.start_at), "d. M. yyyy · HH:mm", { locale: sk })
                              : "Bez dátumu"}
                          </p>
                        </div>
                        <Badge className={`border ${STATUS_BADGE_CLASSNAME[status] ?? STATUS_BADGE_CLASSNAME.pending}`}>
                          {STATUS_LABELS[status] ?? STATUS_LABELS.pending}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

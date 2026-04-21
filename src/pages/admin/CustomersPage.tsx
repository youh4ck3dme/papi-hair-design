import { useEffect, useMemo, useState } from "react";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  UserCheck,
  ArrowUpDown,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Users,
  Sparkles,
  ShieldAlert,
  Copy,
  ExternalLink,
  CircleDashed,
  FilterX,
  Clock3,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

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

type QuickFilter = "all" | "recent" | "loyal" | "missing-contact";

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

const RECENT_ACTIVITY_DAYS = 45;
const LOYAL_CUSTOMER_MIN_VISITS = 3;

function isRecentCustomer(lastVisitAt: string | null): boolean {
  if (!lastVisitAt) return false;
  const visitDate = new Date(lastVisitAt);
  if (Number.isNaN(visitDate.getTime())) return false;

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(now.getDate() - RECENT_ACTIVITY_DAYS);
  return visitDate >= threshold;
}

function buildInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLastVisit(lastVisitAt: string | null, pattern: string) {
  if (!lastVisitAt) return null;
  return format(new Date(lastVisitAt), pattern, { locale: sk });
}

function InsightCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: number;
  hint: string;
  icon: typeof Users;
}) {
  return (
    <div className="admin-premium-card p-4 shadow-lg shadow-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">{title}</p>
          <p className="mt-3 text-3xl font-black text-foreground">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary shadow-inner shadow-primary/10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
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
          getDocs(query(collection(db, "customers"), where("business_id", "==", businessId))),
          getDocs(query(collection(db, "appointments"), where("business_id", "==", businessId))),
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

        const loadedCustomers = customerSnap.docs.map((docSnap) => {
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

    void load();
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
      const historySnap = await getDocs(
        query(
          collection(db, "appointments"),
          where("business_id", "==", businessId),
          where("customer_id", "==", customer.id),
          orderBy("start_at", "desc"),
          limit(20),
        ),
      );

      setCustomerHistory(
        historySnap.docs.map((docSnap) => {
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
        }),
      );
    } catch (error) {
      console.error("CustomersPage: error loading customer history", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const customerMetrics = useMemo(() => {
    const reachable = customers.filter((customer) => customer.email || customer.phone).length;
    const loyal = customers.filter((customer) => customer.visits >= LOYAL_CUSTOMER_MIN_VISITS).length;
    const recent = customers.filter((customer) => isRecentCustomer(customer.lastVisitAt)).length;
    const missingContact = customers.filter((customer) => !customer.email && !customer.phone).length;

    return { reachable, loyal, recent, missingContact };
  }, [customers]);

  const filteredAndSorted = useMemo(() => {
    const queryTerm = search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        const matchesSearch =
          queryTerm.length === 0 ||
          customer.full_name.toLowerCase().includes(queryTerm) ||
          (customer.email?.toLowerCase().includes(queryTerm) ?? false) ||
          (customer.phone?.includes(queryTerm) ?? false);

        if (!matchesSearch) return false;

        switch (quickFilter) {
          case "recent":
            return isRecentCustomer(customer.lastVisitAt);
          case "loyal":
            return customer.visits >= LOYAL_CUSTOMER_MIN_VISITS;
          case "missing-contact":
            return !customer.email && !customer.phone;
          default:
            return true;
        }
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
  }, [customers, quickFilter, search, sortConfig]);

  const visibleSummaryLabel = useMemo(() => {
    switch (quickFilter) {
      case "recent":
        return `Aktívni za posledných ${RECENT_ACTIVITY_DAYS} dní`;
      case "loyal":
        return `Verní klienti (${LOYAL_CUSTOMER_MIN_VISITS}+ návštev)`;
      case "missing-contact":
        return "Klienti bez kontaktu";
      default:
        return "Všetci klienti";
    }
  }, [quickFilter]);

  const resetFilters = () => {
    setSearch("");
    setQuickFilter("all");
    setSortConfig({ key: "full_name", direction: "asc" });
  };

  const copyValue = async (value: string | null, label: string) => {
    if (!value) {
      toast.error(`${label} nie je k dispozícii`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} skopírovaný`);
    } catch {
      toast.error(`Nepodarilo sa skopírovať ${label.toLowerCase()}`);
    }
  };

  const hasActiveFilters = search.trim().length > 0 || quickFilter !== "all";

  return (
    <div className="admin-premium-page space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Zákazníci
          </h1>
          <p className="text-muted-foreground">Robustný prehľad klientov, kontaktov a histórie pre rýchlu owner správu.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:items-center">
          <div className="relative group flex-1 xl:w-[320px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              className="pl-9 w-full bg-card/50 border-primary/10 transition-all focus:ring-primary/20"
              placeholder="Hľadať meno, e-mail alebo telefón..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-primary/15 bg-card/40 text-muted-foreground hover:text-foreground"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <FilterX className="h-4 w-4" /> Vyčistiť filtre
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="Všetci klienti"
          value={customers.length}
          hint="Jednotný prehľad celej zákazníckej databázy."
          icon={Users}
        />
        <InsightCard
          title="Kontaktovateľní"
          value={customerMetrics.reachable}
          hint="Majú e-mail alebo telefón pripravený na okamžitý kontakt."
          icon={UserCheck}
        />
        <InsightCard
          title="Aktívni"
          value={customerMetrics.recent}
          hint={`Navštívili salón za posledných ${RECENT_ACTIVITY_DAYS} dní.`}
          icon={Clock3}
        />
        <InsightCard
          title="Verní klienti"
          value={customerMetrics.loyal}
          hint={`Aspoň ${LOYAL_CUSTOMER_MIN_VISITS} návštevy, vhodní na VIP follow-up.`}
          icon={Sparkles}
        />
      </div>

      <div className="admin-premium-toolbar p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/80">Rýchle segmenty</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { key: "all", label: "Všetci", count: customers.length, icon: Users },
                { key: "recent", label: "Aktívni", count: customerMetrics.recent, icon: Clock3 },
                { key: "loyal", label: "Verní", count: customerMetrics.loyal, icon: Sparkles },
                {
                  key: "missing-contact",
                  label: "Bez kontaktu",
                  count: customerMetrics.missingContact,
                  icon: ShieldAlert,
                },
              ].map(({ key, label, count, icon: Icon }) => {
                const active = quickFilter === key;
                return (
                  <Button
                    key={key}
                    type="button"
                    variant="ghost"
                    onClick={() => setQuickFilter(key as QuickFilter)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                        : "border-primary/10 bg-background/40 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-1 border text-[10px]",
                        active
                          ? "border-primary/20 bg-primary/15 text-primary"
                          : "border-border/70 bg-background/70 text-muted-foreground",
                      )}
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="admin-premium-subtle px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">{visibleSummaryLabel}</p>
            <p className="mt-1 text-muted-foreground">
              Zobrazených <span className="font-semibold text-foreground">{filteredAndSorted.length}</span> z{" "}
              {customers.length} klientov.
            </p>
          </div>
        </div>
      </div>

      <div className="admin-premium-card shadow-2xl shadow-primary/5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
            <p className="text-sm text-muted-foreground animate-pulse">Načítavam zákazníkov...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <CircleDashed className="w-8 h-8 text-primary/30" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Žiadni zákazníci</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
              {hasActiveFilters
                ? "Skúste zmeniť segment alebo vyhľadávací výraz. Aktuálne filtre nenašli žiadneho klienta."
                : "Zatiaľ nemáte žiadnych evidovaných zákazníkov."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-primary/5 text-xs uppercase tracking-wider font-semibold">
                  <TableHead className="w-[320px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("full_name")}
                      className="hover:bg-transparent p-0 h-auto flex items-center gap-1 font-semibold text-[10px]"
                    >
                      Zákazník <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-[10px]">Kontakt & rýchle akcie</TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("visits")}
                      className="hover:bg-transparent p-0 h-auto flex items-center gap-1 mx-auto font-semibold text-[10px]"
                    >
                      Návštevy <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("lastVisitAt")}
                      className="hover:bg-transparent p-0 h-auto flex items-center gap-1 ml-auto font-semibold text-[10px]"
                    >
                      Posledná návšteva <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[56px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((customer) => {
                  const isLoyal = customer.visits >= LOYAL_CUSTOMER_MIN_VISITS;
                  const isRecent = isRecentCustomer(customer.lastVisitAt);
                  const hasEmail = Boolean(customer.email);
                  const hasPhone = Boolean(customer.phone);
                  const hasContact = hasEmail || hasPhone;

                  return (
                    <TableRow key={customer.id} className="group hover:bg-primary/5 border-primary/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-inner group-hover:scale-110 transition-transform">
                            <span className="text-primary font-bold text-xs">{buildInitials(customer.full_name)}</span>
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">{customer.full_name}</span>
                              {isLoyal && (
                                <Badge variant="secondary" className="border-primary/15 bg-primary/10 text-primary">
                                  Verný klient
                                </Badge>
                              )}
                              {!hasContact && (
                                <Badge
                                  variant="secondary"
                                  className="border-amber-500/20 bg-amber-500/10 text-amber-700"
                                >
                                  Chýba kontakt
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              ID: {customer.id.slice(0, 8)}
                            </span>
                            {isRecent && (
                              <span className="mt-1 text-[11px] font-medium text-emerald-600">Aktívny klient</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[240px] flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            {customer.email && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3 text-primary/40" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3 text-primary/40" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                            {!hasContact && (
                              <p className="text-xs text-muted-foreground italic">
                                Klient zatiaľ nemá vyplnený e-mail ani telefón.
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {customer.email && (
                              <Button asChild type="button" variant="outline" size="sm" className="border-primary/10 bg-background/60">
                                <a href={`mailto:${customer.email}`}>
                                  <Mail className="h-3.5 w-3.5" /> Email
                                </a>
                              </Button>
                            )}
                            {customer.phone && (
                              <Button asChild type="button" variant="outline" size="sm" className="border-primary/10 bg-background/60">
                                <a href={`tel:${customer.phone}`}>
                                  <Phone className="h-3.5 w-3.5" /> Volať
                                </a>
                              </Button>
                            )}
                            {hasContact && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-primary/10 bg-background/60"
                                onClick={() =>
                                  void copyValue(customer.email ?? customer.phone, customer.email ? "E-mail" : "Telefón")
                                }
                              >
                                <Copy className="h-3.5 w-3.5" /> Kopírovať kontakt
                              </Button>
                            )}
                          </div>
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
                            <span className="text-sm font-medium">{formatLastVisit(customer.lastVisitAt, "d. M. yyyy")}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {formatLastVisit(customer.lastVisitAt, "EEEE · HH:mm")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10" aria-label={`Akcie pre ${customer.full_name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-lg border-primary/10">
                            <DropdownMenuLabel>Akcie majiteľa</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => void openCustomerHistory(customer)}>
                              <Calendar className="w-4 h-4 opacity-70" /> História rezervácií
                            </DropdownMenuItem>
                            {customer.email && (
                              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`mailto:${customer.email}`, "_self")}>
                                <Mail className="w-4 h-4 opacity-70" /> Napísať e-mail
                              </DropdownMenuItem>
                            )}
                            {customer.phone && (
                              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`tel:${customer.phone}`, "_self")}>
                                <Phone className="w-4 h-4 opacity-70" /> Zavolať klientovi
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-primary/5" />
                            {customer.email && (
                              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => void copyValue(customer.email, "E-mail")}>
                                <Copy className="w-4 h-4 opacity-70" /> Kopírovať e-mail
                              </DropdownMenuItem>
                            )}
                            {customer.phone && (
                              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => void copyValue(customer.phone, "Telefón")}>
                                <Copy className="w-4 h-4 opacity-70" /> Kopírovať telefón
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="admin-premium-dialog max-w-lg border-primary/15">
          <DialogHeader>
            <DialogTitle className="text-xl">História zákazníka</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.full_name ?? "Zákazník"} · {selectedCustomer?.email ?? selectedCustomer?.phone ?? "bez kontaktu"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCustomer && (
              <div className="admin-premium-subtle p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCustomer.email && (
                        <Button asChild type="button" variant="outline" size="sm" className="border-primary/10 bg-background/70">
                          <a href={`mailto:${selectedCustomer.email}`}>
                            <ExternalLink className="h-3.5 w-3.5" /> E-mail
                          </a>
                        </Button>
                      )}
                      {selectedCustomer.phone && (
                        <Button asChild type="button" variant="outline" size="sm" className="border-primary/10 bg-background/70">
                          <a href={`tel:${selectedCustomer.phone}`}>
                            <ExternalLink className="h-3.5 w-3.5" /> Telefón
                          </a>
                        </Button>
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
              <div className="admin-premium-subtle border-dashed p-8 text-center text-sm text-muted-foreground">
                Pre tohto zákazníka zatiaľ neevidujeme žiadnu históriu rezervácií.
              </div>
            ) : (
              <div className="space-y-3">
                {customerHistory.map((appointment) => {
                  const status = appointment.status ?? "pending";
                  return (
                    <div key={appointment.id} className="admin-premium-subtle border-border/60 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{appointment.service_name ?? "Služba"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{appointment.employee_name ?? "Pridelený tím"}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            {appointment.start_at
                              ? format(new Date(appointment.start_at), "d. MMMM yyyy · HH:mm", { locale: sk })
                              : "Čas neznámy"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "w-fit border",
                            STATUS_BADGE_CLASSNAME[status] ?? "bg-slate-500/10 text-slate-700 border-slate-500/20",
                          )}
                        >
                          {STATUS_LABELS[status] ?? "Čaká"}
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

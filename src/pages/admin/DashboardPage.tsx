import { useEffect, useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Briefcase, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { sk } from "date-fns/locale";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Čaká", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Potvrdená", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Zrušená", className: "bg-red-100 text-red-800" },
  completed: { label: "Dokončená", className: "bg-slate-100 text-slate-700" },
};

interface AppointmentCardRow {
  id: string;
  start_at: string;
  status: string;
  customer_name: string | null;
  service_name: string | null;
  employee_name: string | null;
}

export default function DashboardPage() {
  const { businessId } = useBusiness();
  const [stats, setStats] = useState({ today: 0, total: 0, employees: 0, services: 0 });
  const [todayAppointments, setTodayAppointments] = useState<AppointmentCardRow[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const today = new Date();
      const startIso = startOfDay(today).toISOString();
      const endIso = endOfDay(today).toISOString();

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
          service_name?: string | null;
          employee_name?: string | null;
        };

        return {
          id: docSnap.id,
          start_at: appointment.start_at ?? "",
          status: appointment.status ?? "pending",
          customer_name: appointment.customer_name ?? null,
          service_name: appointment.service_name ?? null,
          employee_name: appointment.employee_name ?? null,
        };
      }));
    };

    loadStats();
  }, [businessId]);

  const statCards = [
    { title: "Dnes", value: stats.today, icon: Calendar, color: "text-gold", bg: "bg-gold/10" },
    { title: "Celkovo rezervácií", value: stats.total, icon: TrendingUp, color: "text-gold", bg: "bg-gold/10" },
    { title: "Zamestnanci", value: stats.employees, icon: Users, color: "text-gold", bg: "bg-gold/10" },
    { title: "Služby", value: stats.services, icon: Briefcase, color: "text-gold", bg: "bg-gold/10" },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prehľad</h1>
        <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: sk })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
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
                  <div key={appointment.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="text-sm font-mono font-semibold text-foreground w-12 flex-shrink-0">
                      {appointment.start_at ? format(new Date(appointment.start_at), "HH:mm") : "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{appointment.customer_name ?? "Zákazník"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appointment.service_name ?? "Služba"} · {appointment.employee_name ?? "Pracovník"}
                      </p>
                    </div>
                    <Badge className={`text-xs ${status.className} border-0`}>{status.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

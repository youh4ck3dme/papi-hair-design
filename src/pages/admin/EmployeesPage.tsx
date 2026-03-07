import { useEffect, useState } from "react";
import { db } from "@/integrations/firebase/config";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";

const DAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Pondelok" },
  { key: "tuesday", label: "Utorok" },
  { key: "wednesday", label: "Streda" },
  { key: "thursday", label: "Štvrtok" },
  { key: "friday", label: "Piatok" },
  { key: "saturday", label: "Sobota" },
  { key: "sunday", label: "Nedeľa" },
];

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type ScheduleMap = Partial<Record<DayKey, { start: string; end: string; active: boolean }>>;

const DEFAULT_SCHEDULE: ScheduleMap = Object.fromEntries(
  DAYS.map(({ key }) => [key, { start: "09:00", end: "17:00", active: !["saturday", "sunday"].includes(key) }]),
) as ScheduleMap;

interface EmployeeRow {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  color: string;
}

interface ScheduleRow {
  id: string;
  employee_id: string;
  day_of_week: DayKey;
  start_time: string;
  end_time: string;
}

interface ServiceRow {
  id: string;
  name_sk: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export default function EmployeesPage() {
  const { businessId } = useBusiness();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ScheduleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState({ display_name: "", email: "", phone: "", color: "#3B82F6" });
  const [schedule, setSchedule] = useState<ScheduleMap>(DEFAULT_SCHEDULE);

  const [allServices, setAllServices] = useState<ServiceRow[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);

    const employeeSnap = await getDocs(query(
      collection(db, "employees"),
      where("business_id", "==", businessId),
    ));

    const loadedEmployees = employeeSnap.docs
      .map((docSnap) => {
        const employee = docSnap.data();
        return {
          id: docSnap.id,
          display_name: employee.display_name ?? "",
          email: employee.email ?? null,
          phone: employee.phone ?? null,
          color: employee.color ?? "#3B82F6",
          is_active: employee.is_active !== false,
        };
      })
      .filter((employee) => employee.is_active)
      .map(({ is_active, ...employee }) => employee)
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "sk"));

    setEmployees(loadedEmployees);

    const employeeIds = loadedEmployees.map((employee) => employee.id);
    const loadedSchedules: ScheduleRow[] = [];
    for (const idChunk of chunk(employeeIds, 10)) {
      if (!idChunk.length) continue;
      const scheduleSnap = await getDocs(query(
        collection(db, "schedules"),
        where("employee_id", "in", idChunk),
      ));
      scheduleSnap.docs.forEach((docSnap) => {
        const scheduleData = docSnap.data();
        loadedSchedules.push({
          id: docSnap.id,
          employee_id: scheduleData.employee_id,
          day_of_week: scheduleData.day_of_week,
          start_time: scheduleData.start_time,
          end_time: scheduleData.end_time,
        });
      });
    }

    const scheduleMap: Record<string, ScheduleRow[]> = {};
    loadedSchedules.forEach((scheduleRow) => {
      if (!scheduleMap[scheduleRow.employee_id]) {
        scheduleMap[scheduleRow.employee_id] = [];
      }
      scheduleMap[scheduleRow.employee_id].push(scheduleRow);
    });
    setSchedules(scheduleMap);

    const serviceSnap = await getDocs(query(
      collection(db, "services"),
      where("business_id", "==", businessId),
      where("is_active", "==", true),
    ));
    const loadedServices = serviceSnap.docs
      .map((docSnap) => {
        const service = docSnap.data();
        return {
          id: docSnap.id,
          name_sk: service.name_sk ?? "",
        };
      })
      .sort((a, b) => a.name_sk.localeCompare(b.name_sk, "sk"));
    setAllServices(loadedServices);

    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ display_name: "", email: "", phone: "", color: "#3B82F6" });
    setSchedule(DEFAULT_SCHEDULE);
    setSelectedServiceIds(allServices.map((service) => service.id));
    setOpen(true);
  };

  const openEdit = (employee: EmployeeRow) => {
    setEditing(employee);
    setForm({
      display_name: employee.display_name,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      color: employee.color ?? "#3B82F6",
    });

    const nextSchedule: ScheduleMap = { ...DEFAULT_SCHEDULE };
    (schedules[employee.id] ?? []).forEach((scheduleRow) => {
      nextSchedule[scheduleRow.day_of_week] = {
        start: scheduleRow.start_time,
        end: scheduleRow.end_time,
        active: true,
      };
    });
    DAYS.forEach(({ key }) => {
      if (!schedules[employee.id]?.find((scheduleRow) => scheduleRow.day_of_week === key)) {
        (nextSchedule[key as DayKey] as { active: boolean }).active = false;
      }
    });
    setSchedule(nextSchedule);

    const loadEmployeeServices = async () => {
      const employeeServiceSnap = await getDocs(query(
        collection(db, "employee_services"),
        where("employee_id", "==", employee.id),
      ));
      setSelectedServiceIds(employeeServiceSnap.docs.map((docSnap) => {
        const row = docSnap.data() as { service_id?: string };
        return row.service_id ?? "";
      }).filter(Boolean));
    };
    loadEmployeeServices();

    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) {
      toast.error("Zadajte meno");
      return;
    }

    setSaving(true);

    try {
      let employeeId = editing?.id;
      if (editing) {
        await updateDoc(doc(db, "employees", editing.id), {
          display_name: form.display_name,
          email: form.email || null,
          phone: form.phone || null,
          color: form.color,
          updated_at: new Date().toISOString(),
        });
      } else {
        const createdEmployee = await addDoc(collection(db, "employees"), {
          business_id: businessId,
          display_name: form.display_name,
          email: form.email || null,
          phone: form.phone || null,
          color: form.color,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        employeeId = createdEmployee.id;
      }

      if (employeeId) {
        const scheduleSnap = await getDocs(query(
          collection(db, "schedules"),
          where("employee_id", "==", employeeId),
        ));
        await Promise.all(scheduleSnap.docs.map((docSnap) => deleteDoc(doc(db, "schedules", docSnap.id))));

        const scheduleRows = DAYS
          .filter(({ key }) => schedule[key as DayKey]?.active)
          .map(({ key }) => ({
            employee_id: employeeId as string,
            day_of_week: key as DayKey,
            start_time: schedule[key as DayKey]!.start,
            end_time: schedule[key as DayKey]!.end,
          }));
        await Promise.all(scheduleRows.map((row) => addDoc(collection(db, "schedules"), row)));

        const employeeServicesSnap = await getDocs(query(
          collection(db, "employee_services"),
          where("employee_id", "==", employeeId),
        ));
        await Promise.all(employeeServicesSnap.docs.map((docSnap) => deleteDoc(doc(db, "employee_services", docSnap.id))));
        await Promise.all(selectedServiceIds.map((serviceId) => addDoc(collection(db, "employee_services"), {
          employee_id: employeeId as string,
          service_id: serviceId,
        })));
      }

      toast.success(editing ? "Zamestnanec aktualizovaný" : "Zamestnanec pridaný");
      setOpen(false);
      load();
    } catch (error) {
      console.error("EmployeesPage: failed to save employee", error);
      toast.error("Chyba pri ukladaní zamestnanca");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Skutočne odstrániť zamestnanca?")) return;

    const appointmentSnap = await getDocs(query(
      collection(db, "appointments"),
      where("employee_id", "==", id),
      where("status", "!=", "cancelled"),
      limit(1),
    ));
    if (!appointmentSnap.empty) {
      toast.error("Nemožno odstrániť — existujú rezervácie");
      return;
    }

    const [scheduleSnap, employeeServicesSnap] = await Promise.all([
      getDocs(query(collection(db, "schedules"), where("employee_id", "==", id))),
      getDocs(query(collection(db, "employee_services"), where("employee_id", "==", id))),
    ]);
    await Promise.all([
      ...scheduleSnap.docs.map((docSnap) => deleteDoc(doc(db, "schedules", docSnap.id))),
      ...employeeServicesSnap.docs.map((docSnap) => deleteDoc(doc(db, "employee_services", docSnap.id))),
    ]);
    await deleteDoc(doc(db, "employees", id));

    toast.success("Zamestnanec odstránený");
    load();
  };

  const setScheduleDay = (day: DayKey, field: "start" | "end" | "active", value: string | boolean) => {
    setSchedule((current) => ({ ...current, [day]: { ...current[day], [field]: value } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Zamestnanci</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Pridať zamestnanca</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Žiadni zamestnanci</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Pridať prvého zamestnanca</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => {
            const employeeSchedules = schedules[employee.id] ?? [];
            return (
              <div key={employee.id} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{employee.display_name}</p>
                    {employee.email && <p className="text-xs text-muted-foreground mt-0.5">{employee.email}</p>}
                  </div>
                </div>
                {employeeSchedules.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {employeeSchedules.map((scheduleRow) => (
                      <span key={scheduleRow.id} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {DAYS.find((day) => day.key === scheduleRow.day_of_week)?.label.slice(0, 2)} {scheduleRow.start_time}–{scheduleRow.end_time}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(employee)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />Upraviť
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(employee.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Upraviť zamestnanca" : "Nový zamestnanec"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Meno a priezvisko *</Label>
              <Input value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} placeholder="Jana Nováková" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="jana@salon.sk" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefón</Label>
                <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+421 900 000 000" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Farba v kalendári</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={form.color}
                  onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{form.color}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pracovné hodiny</Label>
              {DAYS.map(({ key, label }) => {
                const daySchedule = schedule[key as DayKey];
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Checkbox
                      id={`day-${key}`}
                      checked={daySchedule?.active ?? false}
                      onCheckedChange={(value) => setScheduleDay(key as DayKey, "active", !!value)}
                    />
                    <label htmlFor={`day-${key}`} className="text-sm w-20 text-foreground">{label}</label>
                    {daySchedule?.active && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          type="time"
                          value={daySchedule.start}
                          onChange={(event) => setScheduleDay(key as DayKey, "start", event.target.value)}
                          className="h-8 text-xs"
                        />
                        <span className="text-muted-foreground text-xs">–</span>
                        <Input
                          type="time"
                          value={daySchedule.end}
                          onChange={(event) => setScheduleDay(key as DayKey, "end", event.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Priradené služby</Label>
              <div className="grid grid-cols-2 gap-2">
                {allServices.map((service) => (
                  <div key={service.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`srv-${service.id}`}
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={(value) => {
                        if (value) {
                          setSelectedServiceIds((current) => [...current, service.id]);
                          return;
                        }
                        setSelectedServiceIds((current) => current.filter((id) => id !== service.id));
                      }}
                    />
                    <label htmlFor={`srv-${service.id}`} className="text-sm text-foreground truncate">{service.name_sk}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Zrušiť</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Uložiť" : "Pridať"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

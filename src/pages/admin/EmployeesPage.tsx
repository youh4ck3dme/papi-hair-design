import { useEffect, useState } from "react";
import { db, storage } from "@/integrations/firebase/config";
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
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useBusiness } from "@/hooks/useBusiness";
import { AvatarCropper } from "@/components/admin/AvatarCropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Users, Mail, Phone, Calendar, Briefcase, ChevronRight, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { compressProfileImage, readFileAsDataUrl, validateProfileImageFile } from "@/lib/profileImage";

const DAYS: { key: string; label: string; sm: string }[] = [
  { key: "monday", label: "Pondelok", sm: "Po" },
  { key: "tuesday", label: "Utorok", sm: "Ut" },
  { key: "wednesday", label: "Streda", sm: "St" },
  { key: "thursday", label: "Štvrtok", sm: "Št" },
  { key: "friday", label: "Piatok", sm: "Pi" },
  { key: "saturday", label: "Sobota", sm: "So" },
  { key: "sunday", label: "Nedeľa", sm: "Ne" },
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
  photo_url: string | null;
  service_mode: "all" | "restricted";
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

const PRESET_EMPLOYEE_PHOTOS: Record<string, string> = {
  mato: "/mato.webp",
  miska: "/miska.webp",
  papi: "/papi.webp",
};

function normalizeEmployeeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveEmployeePhotoUrl(displayName: string, photoUrl: string | null): string | null {
  if (photoUrl) return photoUrl;

  const normalizedName = normalizeEmployeeName(displayName);
  if (normalizedName.includes("mato")) return PRESET_EMPLOYEE_PHOTOS.mato;
  if (normalizedName.includes("miska")) return PRESET_EMPLOYEE_PHOTOS.miska;
  if (normalizedName.includes("papi")) return PRESET_EMPLOYEE_PHOTOS.papi;

  return null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export default function EmployeesPage() {
  const { businessId, isOwner } = useBusiness();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ScheduleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState({ display_name: "", email: "", phone: "", color: "#3B82F6", photo_url: null as string | null });
  const [serviceMode, setServiceMode] = useState<"all" | "restricted">("all");
  const [schedule, setSchedule] = useState<ScheduleMap>(DEFAULT_SCHEDULE);

  const [allServices, setAllServices] = useState<ServiceRow[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);

    try {
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
            photo_url: employee.photo_url ?? null,
            service_mode: employee.service_mode === "restricted" ? "restricted" : "all",
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
    } catch (err) {
      console.error("EmployeesPage: load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [businessId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ display_name: "", email: "", phone: "", color: "#3B82F6", photo_url: null });
    setServiceMode("all");
    setSchedule(DEFAULT_SCHEDULE);
    setSelectedServiceIds([]);
    setOpen(true);
  };

  const openEdit = (employee: EmployeeRow) => {
    setEditing(employee);
    setForm({
      display_name: employee.display_name,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      color: employee.color ?? "#3B82F6",
      photo_url: employee.photo_url ?? null,
    });
    setServiceMode(employee.service_mode ?? "all");

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
        if (nextSchedule[key as DayKey]) {
          nextSchedule[key as DayKey]!.active = false;
        }
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
    if (isOwner) {
      loadEmployeeServices();
    } else {
      setSelectedServiceIds([]);
    }

    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateProfileImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    void (async () => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setCropImageSrc(dataUrl);
      } catch {
        toast.error("Fotku sa nepodarilo načítať");
      }
    })();
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setUploadingPhoto(true);
    try {
      const compressedBlob = await compressProfileImage(croppedBlob);
      const fileName = `employees/${businessId}/${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, compressedBlob, {
        contentType: compressedBlob.type || "image/jpeg",
        cacheControl: "public,max-age=31536000,immutable",
      });
      const url = await getDownloadURL(storageRef);
      setForm((p) => ({ ...p, photo_url: url }));
      setCropImageSrc(null);
      toast.success("Fotka pripravená");
    } catch (err) {
      console.error(err);
      toast.error("Chyba pri príprave fotky");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) {
      toast.error("Zadajte meno");
      return;
    }
    if (isOwner && serviceMode === "restricted" && selectedServiceIds.length === 0) {
      toast.error("Majiteľ musí priradiť aspoň jednu službu.");
      return;
    }

    setSaving(true);

    try {
      let employeeId = editing?.id;
      if (editing) {
        const employeeUpdatePayload: Record<string, unknown> = {
          display_name: form.display_name,
          email: form.email || null,
          phone: form.phone || null,
          color: form.color,
          photo_url: form.photo_url,
          updated_at: new Date().toISOString(),
        };
        if (isOwner) {
          employeeUpdatePayload.service_mode = serviceMode;
        }
        await updateDoc(doc(db, "employees", editing.id), employeeUpdatePayload);
      } else {
        const employeeCreatePayload: Record<string, unknown> = {
          business_id: businessId,
          display_name: form.display_name,
          email: form.email || null,
          phone: form.phone || null,
          color: form.color,
          photo_url: form.photo_url,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (isOwner) {
          employeeCreatePayload.service_mode = serviceMode;
        }
        const createdEmployee = await addDoc(collection(db, "employees"), employeeCreatePayload);
        employeeId = createdEmployee.id;
      }

      if (employeeId) {
        const batch = writeBatch(db);

        const scheduleSnap = await getDocs(query(
          collection(db, "schedules"),
          where("employee_id", "==", employeeId),
        ));
        scheduleSnap.docs.forEach((docSnap) => batch.delete(doc(db, "schedules", docSnap.id)));

        const scheduleRows = DAYS
          .filter(({ key }) => schedule[key as DayKey]?.active)
          .map(({ key }) => ({
            employee_id: employeeId as string,
            day_of_week: key as DayKey,
            start_time: schedule[key as DayKey]!.start,
            end_time: schedule[key as DayKey]!.end,
          }));
        scheduleRows.forEach((row) => batch.set(doc(collection(db, "schedules")), row));

        if (isOwner && serviceMode === "restricted") {
          const employeeServicesSnap = await getDocs(query(
            collection(db, "employee_services"),
            where("employee_id", "==", employeeId),
          ));
          employeeServicesSnap.docs.forEach((docSnap) => batch.delete(doc(db, "employee_services", docSnap.id)));

          selectedServiceIds.forEach((serviceId) => batch.set(doc(collection(db, "employee_services")), {
            business_id: businessId,
            employee_id: employeeId as string,
            service_id: serviceId,
          }));
        }

        await batch.commit();
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

    try {
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

      const batch = writeBatch(db);

      const scheduleSnap = await getDocs(query(collection(db, "schedules"), where("employee_id", "==", id)));
      scheduleSnap.docs.forEach((docSnap) => batch.delete(doc(db, "schedules", docSnap.id)));

      if (isOwner) {
        const employeeServicesSnap = await getDocs(query(collection(db, "employee_services"), where("employee_id", "==", id)));
        employeeServicesSnap.docs.forEach((docSnap) => batch.delete(doc(db, "employee_services", docSnap.id)));
      }

      batch.delete(doc(db, "employees", id));
      await batch.commit();

      toast.success("Zamestnanec odstránený");
      load();
    } catch (err) {
      toast.error("Odstránenie zlyhalo");
    }
  };

  const setScheduleDay = (day: DayKey, field: "start" | "end" | "active", value: string | boolean) => {
    setSchedule((current) => ({ ...current, [day]: { ...current[day], [field]: value } }));
  };

  const formPhotoUrl = resolveEmployeePhotoUrl(form.display_name, form.photo_url);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Tím
          </h1>
          <p className="text-muted-foreground">Správa zamestnancov a ich pracovných harmonogramov.</p>
        </div>
        <Button onClick={openCreate} className="shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <Plus className="w-4 h-4 mr-2" /> Pridať člena tímu
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground animate-pulse">Načítavam zoznam tímu...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-primary/20 rounded-3xl bg-card/20">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-primary/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Žiadni členovia tímu</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1 mb-6">
            Zatiaľ ste nepridali žiadnych zamestnancov. Pridajte prvého, aby ste mohli spravovať jeho služby a rezervácie.
          </p>
          <Button variant="outline" onClick={openCreate} className="border-primary/20">Pridať prvého zamestnanca</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => {
            const employeeSchedules = schedules[employee.id] ?? [];
            const sortedSchedules = [...employeeSchedules].sort((a, b) => {
              const order = DAYS.map(d => d.key);
              return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week);
            });
            const employeePhotoUrl = resolveEmployeePhotoUrl(employee.display_name, employee.photo_url);

            return (
              <div
                key={employee.id}
                className="group relative p-5 rounded-2xl border border-primary/10 bg-card/40 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex gap-3 items-center">
                    <div
                      className="w-12 h-12 rounded-2xl shadow-inner flex items-center justify-center text-white text-lg font-bold bg-cover bg-center overflow-hidden shrink-0"
                      style={{
                        backgroundColor: employee.color,
                        backgroundImage: employeePhotoUrl ? `url(${employeePhotoUrl})` : "none",
                        boxShadow: `inset 0 0 10px rgba(0,0,0,0.1), 0 4px 12px ${employee.color}40`
                      }}
                    >
                      {!employeePhotoUrl && employee.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                        {employee.display_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Aktívny</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  {employee.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 text-primary/40" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-primary/40" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                </div>

                {sortedSchedules.length > 0 && (
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
                      <Calendar className="w-3 h-3" /> Rozvrh hodín
                    </div>
                    <div className="flex flex-wrap gap-1.5 ">
                      {sortedSchedules.map((scheduleRow) => (
                        <Badge
                          key={scheduleRow.id}
                          variant="secondary"
                          className="bg-primary/5 hover:bg-primary/10 border-transparent text-[10px] px-2 py-0.5 font-medium rounded-lg text-foreground/80"
                        >
                          <span className="font-bold mr-1 text-primary/70">{DAYS.find((day) => day.key === scheduleRow.day_of_week)?.sm}</span>
                          {scheduleRow.start_time}-{scheduleRow.end_time}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-primary/5">
                  <Button size="sm" variant="ghost" className="flex-1 h-9 rounded-xl hover:bg-primary/10 text-xs gap-1.5 font-semibold" onClick={() => openEdit(employee)}>
                    <Pencil className="w-3.5 h-3.5" /> Upraviť profil
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(employee.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-2xl border-primary/20 shadow-2xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              {editing ? "Upraviť profil člena" : "Pridať nového člena tímu"}
            </DialogTitle>
            <DialogDescription>
              Základné údaje, pracovný rozvrh a priradené odbornosti.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-2">
            <div className="space-y-6 pb-6 mt-2">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="relative group cursor-pointer w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-background flex items-center justify-center text-white text-2xl font-bold bg-cover bg-center shrink-0"
                    style={{ backgroundColor: form.color, backgroundImage: formPhotoUrl ? `url(${formPhotoUrl})` : "none" }}
                  >
                    {!formPhotoUrl && !uploadingPhoto && form.display_name.charAt(0).toUpperCase()}
                    {uploadingPhoto && <Loader2 className="w-8 h-8 animate-spin text-white" />}

                    {!uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        <Camera className="w-6 h-6 text-white" />
                        <span className="text-[10px] uppercase font-bold text-white tracking-widest">Zmeniť</span>
                      </div>
                    )}

                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} disabled={uploadingPhoto} />
                  </div>
                  <Label className="text-xs font-semibold text-muted-foreground">Profilová fotka</Label>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Celé meno *</Label>
                      <Input
                        value={form.display_name}
                        onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                        placeholder="napr. Jana Nováková"
                        className="bg-background/50 border-primary/10 focus:border-primary/40 focus:ring-primary/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Farba v systéme</Label>
                      <div className="flex gap-3 items-center">
                        <div
                          className="w-10 h-10 rounded-xl shadow-lg shrink-0 border-2 border-background"
                          style={{ backgroundColor: form.color }}
                        />
                        <Input
                          type="color"
                          value={form.color}
                          onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                          className="h-10 w-full p-1 cursor-pointer bg-background/50 border-primary/10 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email (voliteľný)
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="jana@salon.sk"
                    className="bg-background/50 border-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Telefón
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+421 900 000 000"
                    className="bg-background/50 border-primary/10"
                  />
                </div>
              </div>

              <Separator className="bg-primary/5" />

              <div className="space-y-4">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Pracovné hodiny
                </Label>
                <div className="grid gap-3 rounded-2xl bg-muted/30 p-4 border border-primary/5">
                  {DAYS.map(({ key, label }) => {
                    const daySchedule = schedule[key as DayKey];
                    const active = daySchedule?.active ?? false;
                    return (
                      <div key={key} className={cn(
                        "flex flex-col sm:flex-row sm:items-center gap-3 transition-opacity",
                        !active && "opacity-40"
                      )}>
                        <div className="flex items-center gap-3 w-32 shrink-0">
                          <Checkbox
                            id={`day-${key}`}
                            checked={active}
                            onCheckedChange={(v) => setScheduleDay(key as DayKey, "active", !!v)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <label htmlFor={`day-${key}`} className="text-sm font-medium cursor-pointer">{label}</label>
                        </div>

                        {active && (
                          <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left-2 duration-300">
                            <Input
                              type="time"
                              value={daySchedule?.start}
                              onChange={(e) => setScheduleDay(key as DayKey, "start", e.target.value)}
                              className="h-9 text-xs bg-background/50 border-primary/5 focus:border-primary/20"
                            />
                            <Separator className="w-2 h-[1px] bg-muted-foreground/30" />
                            <Input
                              type="time"
                              value={daySchedule?.end}
                              onChange={(e) => setScheduleDay(key as DayKey, "end", e.target.value)}
                              className="h-9 text-xs bg-background/50 border-primary/5 focus:border-primary/20"
                            />
                          </div>
                        )}
                        {!active && (
                          <div className="h-9 flex items-center italic text-[10px] text-muted-foreground ml-9 sm:ml-0">
                            Zatvorené / Voľno
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-primary/5" />

              {isOwner ? (
                <div className="space-y-4">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Priradené služby
                  </Label>
                  <div className="rounded-2xl border border-primary/10 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">Iba vybrané služby</p>
                        <p className="text-xs text-muted-foreground">
                          Vypnuté = zamestnanec môže vykonávať všetky služby. Zapnuté = len označené.
                        </p>
                      </div>
                      <Switch
                        checked={serviceMode === "restricted"}
                        onCheckedChange={(checked) => setServiceMode(checked ? "restricted" : "all")}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>

                  {serviceMode === "restricted" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 rounded-2xl bg-muted/30 p-4 border border-primary/5">
                      {allServices.length === 0 && (
                        <p className="text-xs text-muted-foreground italic col-span-2 py-4 text-center">
                          Najprv vytvorte služby v katalógu.
                        </p>
                      )}
                      {allServices.map((service) => (
                        <div key={service.id} className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                          const isSelected = selectedServiceIds.includes(service.id);
                          if (isSelected) {
                            setSelectedServiceIds(curr => curr.filter(id => id !== service.id));
                          } else {
                            setSelectedServiceIds(curr => [...curr, service.id]);
                          }
                        }}>
                          <Checkbox
                            id={`srv-${service.id}`}
                            checked={selectedServiceIds.includes(service.id)}
                            className="data-[state=checked]:bg-primary"
                            onCheckedChange={() => { }} // handled by div click for better UX
                          />
                          <label htmlFor={`srv-${service.id}`} className="text-sm font-medium cursor-pointer truncate group-hover:text-primary transition-colors">
                            {service.name_sk}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
                      Voľný režim je aktívny. Zamestnanec je dostupný pre všetky služby.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-primary/10 bg-muted/20 p-4 text-sm text-muted-foreground">
                  Priraďovanie služieb k zamestnancom môže meniť iba majiteľ.
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t border-primary/5 bg-background/80 backdrop-blur-md">
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-semibold">Zrušiť</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl px-10 shadow-lg shadow-primary/20 font-bold min-w-[140px]">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ukladám...</>
              ) : (
                editing ? "Uložiť zmeny" : "Vytvoriť profil"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {cropImageSrc && (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
}

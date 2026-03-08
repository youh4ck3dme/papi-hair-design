import { useEffect, useState } from "react";
import { db } from "@/integrations/firebase/config";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Clock, Euro, Sparkles, Tag, Layers } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { z } from "zod";
import { sortServicesByCanonicalOrder } from "@/lib/priceListOrder";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const serviceSchema = z.object({
  name_sk: z.string().min(2, "Názov musí mať aspoň 2 znaky"),
  duration_minutes: z.coerce.number().min(5, "Min. 5 minút"),
  buffer_minutes: z.coerce.number().min(0),
  price: z.coerce.number().min(0).optional(),
  description_sk: z.string().optional(),
});

type ServiceForm = z.infer<typeof serviceSchema>;
const emptyForm: ServiceForm = { name_sk: "", duration_minutes: 30, buffer_minutes: 0, price: undefined, description_sk: "" };

interface ServiceRow {
  id: string;
  name_sk: string;
  description_sk: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  price: number | null;
  is_active: boolean;
  category: string | null;
  subcategory: string | null;
}

export default function ServicesPage() {
  const { businessId } = useBusiness();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const servicesSnap = await getDocs(query(
        collection(db, "services"),
        where("business_id", "==", businessId),
      ));

      const loadedServices = servicesSnap.docs.map((docSnap) => {
        const service = docSnap.data() as Partial<ServiceRow>;
        return {
          id: docSnap.id,
          name_sk: service.name_sk ?? "",
          description_sk: service.description_sk ?? null,
          duration_minutes: service.duration_minutes ?? 30,
          buffer_minutes: service.buffer_minutes ?? 0,
          price: typeof service.price === "number" ? service.price : null,
          is_active: service.is_active !== false,
          category: service.category ?? null,
          subcategory: service.subcategory ?? null,
        };
      });

      setServices(sortServicesByCanonicalOrder(loadedServices));
    } catch (err) {
      console.error("ServicesPage: error loading services", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [businessId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErrors({}); setOpen(true); };
  const openEdit = (service: ServiceRow) => {
    setEditing(service);
    setForm({
      name_sk: service.name_sk,
      duration_minutes: service.duration_minutes,
      buffer_minutes: service.buffer_minutes,
      price: service.price ?? undefined,
      description_sk: service.description_sk ?? "",
    });
    setErrors({});
    setOpen(true);
  };

  const handleSave = async () => {
    const result = serviceSchema.safeParse(form);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          nextErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    const payload = {
      name_sk: result.data.name_sk,
      description_sk: result.data.description_sk ?? null,
      duration_minutes: result.data.duration_minutes,
      buffer_minutes: result.data.buffer_minutes,
      price: result.data.price ?? null,
      business_id: businessId,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        await updateDoc(doc(db, "services", editing.id), payload);
      } else {
        await addDoc(collection(db, "services"), {
          ...payload,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }

      toast.success(editing ? "Služba aktualizovaná" : "Služba pridaná");
      setOpen(false);
      load();
    } catch (error) {
      console.error("ServicesPage: failed to save service", error);
      toast.error("Chyba pri ukladaní služby");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (service: ServiceRow) => {
    try {
      await updateDoc(doc(db, "services", service.id), {
        is_active: !service.is_active,
        updated_at: new Date().toISOString(),
      });
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s));
    } catch (err) {
      toast.error("Zmena stavu zlyhala");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Skutočne chcete odstrániť túto službu?")) return;

    try {
      const appointmentSnap = await getDocs(query(
        collection(db, "appointments"),
        where("service_id", "==", id),
        where("status", "!=", "cancelled"),
        limit(1),
      ));
      if (!appointmentSnap.empty) {
        toast.error("Nemožno odstrániť — existujú rezervácie");
        return;
      }

      await deleteDoc(doc(db, "services", id));
      toast.success("Služba odstránená");
      load();
    } catch (err) {
      toast.error("Odstránenie zlyhalo");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Služby
          </h1>
          <p className="text-muted-foreground">Katalóg služieb a ich nastavenia.</p>
        </div>
        <Button onClick={openCreate} className="shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <Plus className="w-4 h-4 mr-2" /> Pridať službu
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground animate-pulse">Načítavam katalóg služieb...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-primary/20 rounded-3xl bg-card/20">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-primary/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Katalóg je prázdny</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1 mb-6">
            Začnite pridaním vašej prvej služby, ktorú si budú môcť zákazníci rezervovať.
          </p>
          <Button variant="outline" onClick={openCreate} className="border-primary/20">Pridať prvú službu</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                "group relative p-5 rounded-2xl border border-primary/10 bg-card/40 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30",
                !service.is_active && "opacity-60 grayscale-[0.5]"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                      {service.name_sk}
                    </h3>
                    {!service.is_active && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 bg-muted text-muted-foreground border-muted-foreground/20">
                        Neaktívna
                      </Badge>
                    )}
                  </div>
                  {service.description_sk && (
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                      {service.description_sk}
                    </p>
                  )}
                </div>
                <Switch
                  checked={service.is_active}
                  onCheckedChange={() => handleToggle(service)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                  <Clock className="w-3.5 h-3.5 text-primary/60" />
                  <span>{service.duration_minutes} min</span>
                </div>
                {service.buffer_minutes > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500/80">
                    <Layers className="w-3.5 h-3.5 opacity-70" />
                    <span>+{service.buffer_minutes} min pauza</span>
                  </div>
                )}
                {service.price != null && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-sm font-bold">
                      {service.price}€
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-primary/5">
                <Button size="sm" variant="ghost" className="flex-1 h-9 rounded-xl hover:bg-primary/10 text-xs gap-1.5" onClick={() => openEdit(service)}>
                  <Pencil className="w-3.5 h-3.5" /> Upraviť
                </Button>
                <Button size="sm" variant="ghost" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(service.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {(service.category || service.subcategory) && (
                <div className="absolute -top-2 -left-2 flex gap-1 transform transition-transform group-hover:-translate-y-1">
                  {service.category && (
                    <Badge className="text-[9px] px-1.5 h-5 bg-background shadow-md border-primary/10 text-primary capitalize">
                      {service.category}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="w-4 h-4 text-primary" />
              </div>
              {editing ? "Upraviť službu" : "Pridať novú službu"}
            </DialogTitle>
            <DialogDescription>
              Nastavenia služby, trvania a ceny v katalógu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="srv-name" className="text-sm font-semibold">Názov služby *</Label>
              <Input
                id="srv-name"
                className="bg-background/50 border-primary/10 focus:border-primary/40 focus:ring-primary/10"
                value={form.name_sk}
                onChange={(e) => setForm((prev) => ({ ...prev, name_sk: e.target.value }))}
                placeholder="napr. Dámsky strih a styling"
              />
              {errors.name_sk && <p className="text-destructive text-[10px] font-medium">{errors.name_sk}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="srv-desc" className="text-sm font-semibold">Popis (voliteľný)</Label>
              <Input
                id="srv-desc"
                className="bg-background/50 border-primary/10 focus:border-primary/40 focus:ring-primary/10"
                value={form.description_sk}
                onChange={(e) => setForm((prev) => ({ ...prev, description_sk: e.target.value }))}
                placeholder="Stručný popis pre zákazníkov..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" /> Trvanie (min)
                </Label>
                <Input
                  type="number"
                  min={5}
                  className="bg-background/50 border-primary/10"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: +e.target.value }))}
                />
                {errors.duration_minutes && <p className="text-destructive text-[10px]">{errors.duration_minutes}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-muted-foreground" /> Pauza (min)
                </Label>
                <Input
                  type="number"
                  min={0}
                  className="bg-background/50 border-primary/10"
                  value={form.buffer_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, buffer_minutes: +e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Euro className="w-3 h-3 text-muted-foreground" /> Cena (€)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  className="bg-background/50 border-primary/10 font-bold"
                  value={form.price ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value ? +e.target.value : undefined }))}
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 font-medium">
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl hover:bg-muted font-semibold">Zrušiť</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl px-8 shadow-lg shadow-primary/20 font-bold">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ukladám...</>
              ) : (
                editing ? "Uložiť zmeny" : "Vytvoriť službu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { db } from "@/integrations/firebase/config";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { z } from "zod";
import { sortServicesByCanonicalOrder } from "@/lib/priceListOrder";

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
    setLoading(true);
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
    setLoading(false);
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
    await updateDoc(doc(db, "services", service.id), {
      is_active: !service.is_active,
      updated_at: new Date().toISOString(),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Skutočne chcete odstrániť túto službu?")) return;

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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Služby</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Pridať službu</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <LogoIcon size="md" className="mx-auto mb-3 opacity-30" />
          <p>Žiadne služby</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Pridať prvú službu</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} className={`p-4 rounded-xl border border-border bg-card transition-opacity ${!service.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{service.name_sk}</p>
                  {service.description_sk && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{service.description_sk}</p>}
                </div>
                <Switch checked={service.is_active} onCheckedChange={() => handleToggle(service)} />
              </div>
              <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                <span>{service.duration_minutes} min</span>
                {service.buffer_minutes > 0 && <span>+{service.buffer_minutes} min prestávka</span>}
                {service.price != null && <span className="ml-auto font-medium text-foreground">{service.price}€</span>}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(service)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />Upraviť
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(service.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Upraviť službu" : "Nová služba"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Názov</Label>
              <Input value={form.name_sk} onChange={(event) => setForm((current) => ({ ...current, name_sk: event.target.value }))} placeholder="Strihanie vlasov" />
              {errors.name_sk && <p className="text-destructive text-xs">{errors.name_sk}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Popis (voliteľný)</Label>
              <Input value={form.description_sk} onChange={(event) => setForm((current) => ({ ...current, description_sk: event.target.value }))} placeholder="Krátky popis..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Trvanie (min)</Label>
                <Input type="number" min={5} value={form.duration_minutes} onChange={(event) => setForm((current) => ({ ...current, duration_minutes: +event.target.value }))} />
                {errors.duration_minutes && <p className="text-destructive text-xs">{errors.duration_minutes}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Buffer (min)</Label>
                <Input type="number" min={0} value={form.buffer_minutes} onChange={(event) => setForm((current) => ({ ...current, buffer_minutes: +event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cena (€)</Label>
                <Input type="number" min={0} step={0.5} value={form.price ?? ""} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value ? +event.target.value : undefined }))} placeholder="—" />
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

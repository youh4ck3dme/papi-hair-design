import { useEffect, useMemo, useState } from "react";
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
  writeBatch,
} from "firebase/firestore";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Euro,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceRow } from "@/components/booking/types";
import {
  BOOKING_MAIN_CATEGORIES,
  buildServiceSubcategoryGroups,
  normalizeSubcategoryName,
  resolveServiceCategory,
  slugifySubcategoryName,
  sortServiceSubcategories,
  type BookingMainCategory,
  type ServiceSubcategoryGroup,
  type ServiceSubcategoryRow,
} from "@/lib/serviceSubcategories";

const UNASSIGNED_SUBCATEGORY_VALUE = "__none__";
const UNASSIGNED_SUBCATEGORY_LABEL = "Bez podkategórie";
const SORT_STEP = 100;

const serviceSchema = z.object({
  name_sk: z.string().min(2, "Názov musí mať aspoň 2 znaky"),
  duration_minutes: z.coerce.number().min(5, "Min. 5 minút"),
  buffer_minutes: z.coerce.number().min(0),
  price: z.coerce.number().min(0).optional(),
  description_sk: z.string().optional(),
  category: z.enum(["damske", "panske"]),
  subcategory_id: z.string().optional().nullable(),
});

const subcategorySchema = z.object({
  name_sk: z.string().min(2, "Názov musí mať aspoň 2 znaky"),
  category: z.enum(["damske", "panske"]),
  is_active: z.boolean(),
});

type ServiceForm = z.infer<typeof serviceSchema>;
type SubcategoryForm = z.infer<typeof subcategorySchema>;

const emptyServiceForm: ServiceForm = {
  name_sk: "",
  duration_minutes: 30,
  buffer_minutes: 0,
  price: undefined,
  description_sk: "",
  category: "damske",
  subcategory_id: null,
};

const emptySubcategoryForm: SubcategoryForm = {
  name_sk: "",
  category: "damske",
  is_active: true,
};

function normalizeService(docSnap: { id: string; data: () => Record<string, unknown> }): ServiceRow {
  const service = docSnap.data();
  return {
    id: docSnap.id,
    name_sk: typeof service.name_sk === "string" ? service.name_sk : "",
    description_sk: typeof service.description_sk === "string" ? service.description_sk : null,
    duration_minutes: typeof service.duration_minutes === "number" ? service.duration_minutes : 30,
    buffer_minutes: typeof service.buffer_minutes === "number" ? service.buffer_minutes : 0,
    price: typeof service.price === "number" ? service.price : null,
    sort_order: typeof service.sort_order === "number" ? service.sort_order : null,
    is_active: service.is_active !== false,
    business_id: typeof service.business_id === "string" ? service.business_id : "",
    category: typeof service.category === "string" ? service.category : null,
    subcategory: typeof service.subcategory === "string" ? service.subcategory : null,
    subcategory_id: typeof service.subcategory_id === "string" ? service.subcategory_id : null,
  };
}

function normalizeServiceSubcategory(docSnap: {
  id: string;
  data: () => Record<string, unknown>;
}): ServiceSubcategoryRow {
  const subcategory = docSnap.data();
  const name = typeof subcategory.name_sk === "string" ? subcategory.name_sk : "";
  return {
    id: docSnap.id,
    business_id: typeof subcategory.business_id === "string" ? subcategory.business_id : "",
    category: subcategory.category === "panske" ? "panske" : "damske",
    name_sk: name,
    slug:
      typeof subcategory.slug === "string" && subcategory.slug.trim().length > 0
        ? subcategory.slug
        : slugifySubcategoryName(name),
    sort_order: typeof subcategory.sort_order === "number" ? subcategory.sort_order : null,
    is_active: subcategory.is_active !== false,
    created_at: typeof subcategory.created_at === "string" ? subcategory.created_at : null,
    updated_at: typeof subcategory.updated_at === "string" ? subcategory.updated_at : null,
  };
}

function getNextSortOrder(values: Array<number | null | undefined>) {
  const maxValue = values.reduce((max, value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return max;
    return Math.max(max, value);
  }, 0);

  return maxValue + SORT_STEP;
}

function getCategoryLabel(category: BookingMainCategory) {
  return BOOKING_MAIN_CATEGORIES.find((option) => option.id === category)?.label ?? category;
}

function getServiceTargetSortOrder(
  services: ServiceRow[],
  category: BookingMainCategory,
  subcategoryId: string | null,
  subcategoryName: string | null,
) {
  const matchingServices = services.filter((service) => {
    if (resolveServiceCategory(service) !== category) {
      return false;
    }

    if (subcategoryId) {
      return (
        service.subcategory_id === subcategoryId ||
        normalizeSubcategoryName(service.subcategory) === subcategoryName
      );
    }

    return normalizeSubcategoryName(service.subcategory) == null;
  });

  return getNextSortOrder(matchingServices.map((service) => service.sort_order));
}

async function persistSequentialSortOrder<T extends { id: string }>(
  collectionName: string,
  records: T[],
) {
  if (records.length === 0) return;

  const batch = writeBatch(db);
  records.forEach((record, index) => {
    batch.update(doc(db, collectionName, record.id), {
      sort_order: (index + 1) * SORT_STEP,
      updated_at: new Date().toISOString(),
    });
  });
  await batch.commit();
}

export default function ServicesPage() {
  const { businessId } = useBusiness();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [serviceSubcategories, setServiceSubcategories] = useState<ServiceSubcategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<ServiceSubcategoryRow | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryForm>(emptySubcategoryForm);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});
  const [subcategoryErrors, setSubcategoryErrors] = useState<Record<string, string>>({});
  const [savingService, setSavingService] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [servicesSnap, subcategoriesSnap] = await Promise.all([
        getDocs(query(collection(db, "services"), where("business_id", "==", businessId))),
        getDocs(
          query(collection(db, "service_subcategories"), where("business_id", "==", businessId)),
        ),
      ]);

      setServices(servicesSnap.docs.map(normalizeService));
      setServiceSubcategories(
        sortServiceSubcategories(subcategoriesSnap.docs.map(normalizeServiceSubcategory)),
      );
    } catch (error) {
      console.error("ServicesPage: error loading services", error);
      toast.error("Nepodarilo sa načítať katalóg služieb");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [businessId]);

  const categoryGroups = useMemo(
    () =>
      BOOKING_MAIN_CATEGORIES.map((category) => ({
        category,
        groups: buildServiceSubcategoryGroups(services, serviceSubcategories, category.id, {
          includeEmpty: true,
          uncategorizedLabel: UNASSIGNED_SUBCATEGORY_LABEL,
        }),
      })),
    [services, serviceSubcategories],
  );

  const subcategoryOptionsForForm = useMemo(
    () =>
      sortServiceSubcategories(
        serviceSubcategories.filter(
          (subcategory) =>
            subcategory.category === serviceForm.category && subcategory.is_active !== false,
        ),
      ),
    [serviceSubcategories, serviceForm.category],
  );

  const openCreateService = () => {
    setEditingService(null);
    setServiceForm(emptyServiceForm);
    setServiceErrors({});
    setServiceDialogOpen(true);
  };

  const openEditService = (service: ServiceRow) => {
    setEditingService(service);
    setServiceForm({
      name_sk: service.name_sk,
      duration_minutes: service.duration_minutes,
      buffer_minutes: service.buffer_minutes,
      price: service.price ?? undefined,
      description_sk: service.description_sk ?? "",
      category: resolveServiceCategory(service),
      subcategory_id: service.subcategory_id ?? null,
    });
    setServiceErrors({});
    setServiceDialogOpen(true);
  };

  const openCreateSubcategory = (category: BookingMainCategory = "damske") => {
    setEditingSubcategory(null);
    setSubcategoryForm({ ...emptySubcategoryForm, category });
    setSubcategoryErrors({});
    setSubcategoryDialogOpen(true);
  };

  const openEditSubcategory = (subcategory: ServiceSubcategoryRow) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      name_sk: subcategory.name_sk,
      category: subcategory.category,
      is_active: subcategory.is_active,
    });
    setSubcategoryErrors({});
    setSubcategoryDialogOpen(true);
  };

  const handleSaveService = async () => {
    const result = serviceSchema.safeParse(serviceForm);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          nextErrors[error.path[0] as string] = error.message;
        }
      });
      setServiceErrors(nextErrors);
      return;
    }

    if (!businessId) {
      toast.error("Chýba business kontext");
      return;
    }

    setSavingService(true);

    const targetSubcategory = result.data.subcategory_id
      ? serviceSubcategories.find((subcategory) => subcategory.id === result.data.subcategory_id) ??
        null
      : null;
    const targetCategory = result.data.category;
    const targetSubcategoryName = targetSubcategory?.name_sk ?? null;
    const movedToDifferentGroup = editingService
      ? resolveServiceCategory(editingService) !== targetCategory ||
        (editingService.subcategory_id ?? null) !== (targetSubcategory?.id ?? null)
      : true;

    const payload = {
      name_sk: result.data.name_sk,
      description_sk: result.data.description_sk?.trim() ? result.data.description_sk.trim() : null,
      duration_minutes: result.data.duration_minutes,
      buffer_minutes: result.data.buffer_minutes,
      price: result.data.price ?? null,
      category: targetCategory,
      subcategory_id: targetSubcategory?.id ?? null,
      subcategory: targetSubcategoryName,
      sort_order:
        editingService && !movedToDifferentGroup && typeof editingService.sort_order === "number"
          ? editingService.sort_order
          : getServiceTargetSortOrder(
              services,
              targetCategory,
              targetSubcategory?.id ?? null,
              targetSubcategoryName,
            ),
      business_id: businessId,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingService) {
        await updateDoc(doc(db, "services", editingService.id), payload);
      } else {
        await addDoc(collection(db, "services"), {
          ...payload,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }

      toast.success(editingService ? "Služba aktualizovaná" : "Služba pridaná");
      setServiceDialogOpen(false);
      await load();
    } catch (error) {
      console.error("ServicesPage: failed to save service", error);
      toast.error("Chyba pri ukladaní služby");
    } finally {
      setSavingService(false);
    }
  };

  const handleSaveSubcategory = async () => {
    const result = subcategorySchema.safeParse(subcategoryForm);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          nextErrors[error.path[0] as string] = error.message;
        }
      });
      setSubcategoryErrors(nextErrors);
      return;
    }

    if (!businessId) {
      toast.error("Chýba business kontext");
      return;
    }

    setSavingSubcategory(true);
    const normalizedName = result.data.name_sk.trim();
    const payload = {
      business_id: businessId,
      category: result.data.category,
      name_sk: normalizedName,
      slug: slugifySubcategoryName(normalizedName),
      is_active: result.data.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingSubcategory) {
        await updateDoc(doc(db, "service_subcategories", editingSubcategory.id), {
          ...payload,
          sort_order:
            typeof editingSubcategory.sort_order === "number"
              ? editingSubcategory.sort_order
              : getNextSortOrder(
                  serviceSubcategories
                    .filter((subcategory) => subcategory.category === result.data.category)
                    .map((subcategory) => subcategory.sort_order),
                ),
        });

        const assignedServices = services.filter(
          (service) => service.subcategory_id === editingSubcategory.id,
        );
        if (assignedServices.length > 0) {
          const batch = writeBatch(db);
          assignedServices.forEach((service) => {
            batch.update(doc(db, "services", service.id), {
              category: result.data.category,
              subcategory: normalizedName,
              updated_at: new Date().toISOString(),
            });
          });
          await batch.commit();
        }
      } else {
        await addDoc(collection(db, "service_subcategories"), {
          ...payload,
          sort_order: getNextSortOrder(
            serviceSubcategories
              .filter((subcategory) => subcategory.category === result.data.category)
              .map((subcategory) => subcategory.sort_order),
          ),
          created_at: new Date().toISOString(),
        });
      }

      toast.success(editingSubcategory ? "Podkategória aktualizovaná" : "Podkategória pridaná");
      setSubcategoryDialogOpen(false);
      await load();
    } catch (error) {
      console.error("ServicesPage: failed to save subcategory", error);
      toast.error("Chyba pri ukladaní podkategórie");
    } finally {
      setSavingSubcategory(false);
    }
  };

  const handleToggleService = async (service: ServiceRow) => {
    try {
      await updateDoc(doc(db, "services", service.id), {
        is_active: !service.is_active,
        updated_at: new Date().toISOString(),
      });
      setServices((previous) =>
        previous.map((item) =>
          item.id === service.id ? { ...item, is_active: !item.is_active } : item,
        ),
      );
    } catch {
      toast.error("Zmena stavu zlyhala");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Skutočne chcete odstrániť túto službu?")) return;

    try {
      const appointmentSnap = await getDocs(
        query(
          collection(db, "appointments"),
          where("service_id", "==", serviceId),
          where("status", "!=", "cancelled"),
          limit(1),
        ),
      );
      if (!appointmentSnap.empty) {
        toast.error("Nemožno odstrániť — existujú rezervácie");
        return;
      }

      await deleteDoc(doc(db, "services", serviceId));
      toast.success("Služba odstránená");
      await load();
    } catch {
      toast.error("Odstránenie zlyhalo");
    }
  };

  const handleDeleteSubcategory = async (subcategory: ServiceSubcategoryRow) => {
    if (!confirm(`Skutočne chcete odstrániť podkategóriu „${subcategory.name_sk}“?`)) return;

    try {
      const assignedServices = services.filter((service) => service.subcategory_id === subcategory.id);
      if (assignedServices.length > 0) {
        const batch = writeBatch(db);
        assignedServices.forEach((service) => {
          batch.update(doc(db, "services", service.id), {
            subcategory_id: null,
            subcategory: null,
            updated_at: new Date().toISOString(),
          });
        });
        batch.delete(doc(db, "service_subcategories", subcategory.id));
        await batch.commit();
      } else {
        await deleteDoc(doc(db, "service_subcategories", subcategory.id));
      }

      toast.success("Podkategória odstránená");
      await load();
    } catch (error) {
      console.error("ServicesPage: failed to delete subcategory", error);
      toast.error("Odstránenie podkategórie zlyhalo");
    }
  };

  const handleMoveSubcategory = async (
    subcategoryId: string,
    category: BookingMainCategory,
    direction: "up" | "down",
  ) => {
    const ordered = sortServiceSubcategories(
      serviceSubcategories.filter(
        (subcategory) => subcategory.category === category && subcategory.is_active !== false,
      ),
    );
    const index = ordered.findIndex((subcategory) => subcategory.id === subcategoryId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const reordered = [...ordered];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await persistSequentialSortOrder("service_subcategories", reordered);
      await load();
    } catch (error) {
      console.error("ServicesPage: failed to reorder subcategories", error);
      toast.error("Zmena poradia podkategórií zlyhala");
    }
  };

  const handleMoveService = async (
    group: ServiceSubcategoryGroup<ServiceRow>,
    serviceId: string,
    direction: "up" | "down",
  ) => {
    const index = group.services.findIndex((service) => service.id === serviceId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= group.services.length) return;

    const reordered = [...group.services];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await persistSequentialSortOrder("services", reordered);
      await load();
    } catch (error) {
      console.error("ServicesPage: failed to reorder services", error);
      toast.error("Zmena poradia služieb zlyhala");
    }
  };

  const renderServiceCard = (
    service: ServiceRow,
    group: ServiceSubcategoryGroup<ServiceRow>,
  ) => {
    const serviceIndex = group.services.findIndex((item) => item.id === service.id);
    const canMoveUp = serviceIndex > 0;
    const canMoveDown = serviceIndex >= 0 && serviceIndex < group.services.length - 1;

    return (
      <div
        key={service.id}
        className={cn(
          "group rounded-2xl border border-primary/10 bg-card/40 p-5 backdrop-blur-xl transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5",
          !service.is_active && "opacity-60 grayscale-[0.4]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                {service.name_sk}
              </h3>
              {!service.is_active && (
                <Badge
                  variant="outline"
                  className="h-4 border-muted-foreground/20 bg-muted py-0 text-[10px] text-muted-foreground"
                >
                  Neaktívna
                </Badge>
              )}
            </div>
            {service.description_sk && (
              <p className="line-clamp-2 min-h-[2.5em] text-xs text-muted-foreground">
                {service.description_sk}
              </p>
            )}
          </div>
          <Switch
            checked={service.is_active}
            onCheckedChange={() => void handleToggleService(service)}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <div className="mb-5 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
            <Clock className="h-3.5 w-3.5 text-primary/60" />
            <span>{service.duration_minutes} min</span>
          </div>
          {service.buffer_minutes > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500/80">
              <Layers className="h-3.5 w-3.5 opacity-70" />
              <span>+{service.buffer_minutes} min pauza</span>
            </div>
          )}
          {service.price != null && (
            <Badge className="ml-auto border-primary/20 bg-primary/10 text-sm font-bold text-primary">
              {service.price}€
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-primary/5 pt-4">
          <Button
            size="sm"
            variant="ghost"
            className="h-9 rounded-xl px-3 text-xs"
            disabled={!canMoveUp}
            onClick={() => void handleMoveService(group, service.id, "up")}
          >
            <ArrowUp className="mr-1.5 h-3.5 w-3.5" /> Hore
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 rounded-xl px-3 text-xs"
            disabled={!canMoveDown}
            onClick={() => void handleMoveService(group, service.id, "down")}
          >
            <ArrowDown className="mr-1.5 h-3.5 w-3.5" /> Dole
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 flex-1 rounded-xl text-xs"
            onClick={() => openEditService(service)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Upraviť
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void handleDeleteService(service.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Služby
          </h1>
          <p className="text-muted-foreground">
            Katalóg služieb, podkategórie a ich poradie v bookingu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => openCreateSubcategory()}
            className="border-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Pridať podkategóriu
          </Button>
          <Button
            onClick={openCreateService}
            className="shadow-lg shadow-primary/20 transition-transform hover:scale-105"
          >
            <Plus className="mr-2 h-4 w-4" /> Pridať službu
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
          <p className="animate-pulse text-sm text-muted-foreground">
            Načítavam katalóg služieb...
          </p>
        </div>
      ) : services.length === 0 && serviceSubcategories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-primary/20 bg-card/20 py-20 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
            <Sparkles className="h-10 w-10 text-primary/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Katalóg je prázdny</h3>
          <p className="mx-auto mb-6 mt-1 max-w-xs text-sm text-muted-foreground">
            Začnite pridaním podkategórií a služieb, ktoré sa zobrazia aj vo verejnom
            bookingu.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => openCreateSubcategory()}
              className="border-primary/20"
            >
              Pridať podkategóriu
            </Button>
            <Button onClick={openCreateService}>Pridať prvú službu</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {categoryGroups.map(({ category, groups }) => {
            if (groups.length === 0) {
              return null;
            }

            const orderedManagedSubcategories = sortServiceSubcategories(
              serviceSubcategories.filter(
                (subcategory) =>
                  subcategory.category === category.id && subcategory.is_active !== false,
              ),
            );

            return (
              <section key={category.id} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-foreground/80">
                    <div className="h-6 w-1 rounded-full bg-primary" />
                    {category.label}
                  </h2>
                  <div className="h-px flex-1 bg-primary/10" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={() => openCreateSubcategory(category.id)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Podkategória
                  </Button>
                </div>

                <div className="space-y-4">
                  {groups.map((group) => {
                    const managedIndex = group.option.id
                      ? orderedManagedSubcategories.findIndex(
                          (subcategory) => subcategory.id === group.option.id,
                        )
                      : -1;
                    const canMoveSubcategoryUp = managedIndex > 0;
                    const canMoveSubcategoryDown =
                      managedIndex >= 0 &&
                      managedIndex < orderedManagedSubcategories.length - 1;
                    const linkedSubcategory = group.option.id
                      ? serviceSubcategories.find(
                          (subcategory) => subcategory.id === group.option.id,
                        ) ?? null
                      : null;

                    return (
                      <div
                        key={group.option.key}
                        className="rounded-3xl border border-primary/10 bg-card/30 p-5 backdrop-blur-xl"
                      >
                        <div className="flex flex-col gap-3 border-b border-primary/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-foreground">
                                {group.option.name_sk}
                              </h3>
                              <Badge
                                variant="outline"
                                className="border-primary/20 bg-primary/5 text-primary"
                              >
                                {group.services.length} služieb
                              </Badge>
                              {group.option.isFallback && !group.option.isUncategorized && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/20 bg-amber-500/10 text-amber-600"
                                >
                                  Legacy fallback
                                </Badge>
                              )}
                              {group.option.isUncategorized && (
                                <Badge
                                  variant="outline"
                                  className="border-muted-foreground/20 bg-muted text-muted-foreground"
                                >
                                  Bez priradenia
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {group.option.id
                                ? `Riadená podkategória pre ${getCategoryLabel(
                                    group.option.category,
                                  ).toLowerCase()}.`
                                : "Fallback pre služby bez explicitného priradenia alebo pre staré dáta."}
                            </p>
                          </div>

                          {linkedSubcategory ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl"
                                disabled={!canMoveSubcategoryUp}
                                onClick={() =>
                                  void handleMoveSubcategory(
                                    linkedSubcategory.id,
                                    linkedSubcategory.category,
                                    "up",
                                  )
                                }
                              >
                                <ArrowUp className="mr-1.5 h-3.5 w-3.5" /> Hore
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl"
                                disabled={!canMoveSubcategoryDown}
                                onClick={() =>
                                  void handleMoveSubcategory(
                                    linkedSubcategory.id,
                                    linkedSubcategory.category,
                                    "down",
                                  )
                                }
                              >
                                <ArrowDown className="mr-1.5 h-3.5 w-3.5" /> Dole
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl"
                                onClick={() => openEditSubcategory(linkedSubcategory)}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Upraviť
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => void handleDeleteSubcategory(linkedSubcategory)}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Zmazať
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {group.services.length === 0 ? (
                          <div className="py-8 text-sm text-muted-foreground">
                            V tejto podkategórii zatiaľ nie sú priradené žiadne služby.
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {group.services.map((service) => renderServiceCard(service, group))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-xl border-primary/20 bg-card/95 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              {editingService ? "Upraviť službu" : "Pridať novú službu"}
            </DialogTitle>
            <DialogDescription>
              Nastavenia služby, hlavnej kategórie a podkategórie pre dashboard aj booking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="srv-name" className="text-sm font-semibold">
                Názov služby *
              </Label>
              <Input
                id="srv-name"
                className="border-primary/10 bg-background/50 focus:border-primary/40 focus:ring-primary/10"
                value={serviceForm.name_sk}
                onChange={(event) =>
                  setServiceForm((previous) => ({ ...previous, name_sk: event.target.value }))
                }
                placeholder="napr. Dámsky strih a styling"
              />
              {serviceErrors.name_sk && (
                <p className="text-[10px] font-medium text-destructive">
                  {serviceErrors.name_sk}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="srv-desc" className="text-sm font-semibold">
                Popis (voliteľný)
              </Label>
              <Textarea
                id="srv-desc"
                className="min-h-[96px] border-primary/10 bg-background/50 focus:border-primary/40 focus:ring-primary/10"
                value={serviceForm.description_sk}
                onChange={(event) =>
                  setServiceForm((previous) => ({
                    ...previous,
                    description_sk: event.target.value,
                  }))
                }
                placeholder="Stručný popis pre zákazníkov..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Hlavná kategória</Label>
                <Select
                  value={serviceForm.category}
                  onValueChange={(value) => {
                    const nextCategory = value as BookingMainCategory;
                    setServiceForm((previous) => ({
                      ...previous,
                      category: nextCategory,
                      subcategory_id: serviceSubcategories.some(
                        (subcategory) =>
                          subcategory.id === previous.subcategory_id &&
                          subcategory.category === nextCategory,
                      )
                        ? previous.subcategory_id
                        : null,
                    }));
                  }}
                >
                  <SelectTrigger className="border-primary/10 bg-background/50">
                    <SelectValue placeholder="Vyberte kategóriu" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_MAIN_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Podkategória</Label>
                <Select
                  value={serviceForm.subcategory_id ?? UNASSIGNED_SUBCATEGORY_VALUE}
                  onValueChange={(value) =>
                    setServiceForm((previous) => ({
                      ...previous,
                      subcategory_id:
                        value === UNASSIGNED_SUBCATEGORY_VALUE ? null : value,
                    }))
                  }
                >
                  <SelectTrigger className="border-primary/10 bg-background/50">
                    <SelectValue placeholder="Vyberte podkategóriu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_SUBCATEGORY_VALUE}>
                      {UNASSIGNED_SUBCATEGORY_LABEL}
                    </SelectItem>
                    {subcategoryOptionsForForm.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name_sk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Clock className="h-3 w-3 text-muted-foreground" /> Trvanie (min)
                </Label>
                <Input
                  type="number"
                  min={5}
                  className="border-primary/10 bg-background/50"
                  value={serviceForm.duration_minutes}
                  onChange={(event) =>
                    setServiceForm((previous) => ({
                      ...previous,
                      duration_minutes: +event.target.value,
                    }))
                  }
                />
                {serviceErrors.duration_minutes && (
                  <p className="text-[10px] text-destructive">
                    {serviceErrors.duration_minutes}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Layers className="h-3 w-3 text-muted-foreground" /> Pauza (min)
                </Label>
                <Input
                  type="number"
                  min={0}
                  className="border-primary/10 bg-background/50"
                  value={serviceForm.buffer_minutes}
                  onChange={(event) =>
                    setServiceForm((previous) => ({
                      ...previous,
                      buffer_minutes: +event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Euro className="h-3 w-3 text-muted-foreground" /> Cena (€)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  className="border-primary/10 bg-background/50 font-bold"
                  value={serviceForm.price ?? ""}
                  onChange={(event) =>
                    setServiceForm((previous) => ({
                      ...previous,
                      price: event.target.value ? +event.target.value : undefined,
                    }))
                  }
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setServiceDialogOpen(false)}
              className="rounded-xl font-semibold hover:bg-muted"
            >
              Zrušiť
            </Button>
            <Button
              onClick={() => void handleSaveService()}
              disabled={savingService}
              className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
            >
              {savingService ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ukladám...
                </>
              ) : editingService ? (
                "Uložiť zmeny"
              ) : (
                "Vytvoriť službu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent className="max-w-lg border-primary/20 bg-card/95 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              {editingSubcategory ? "Upraviť podkategóriu" : "Pridať podkategóriu"}
            </DialogTitle>
            <DialogDescription>
              Podkategórie riadia grouping a poradie služieb vo verejnom bookingu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory-name" className="text-sm font-semibold">
                Názov podkategórie *
              </Label>
              <Input
                id="subcategory-name"
                className="border-primary/10 bg-background/50 focus:border-primary/40 focus:ring-primary/10"
                value={subcategoryForm.name_sk}
                onChange={(event) =>
                  setSubcategoryForm((previous) => ({
                    ...previous,
                    name_sk: event.target.value,
                  }))
                }
                placeholder="napr. Balayage"
              />
              {subcategoryErrors.name_sk && (
                <p className="text-[10px] font-medium text-destructive">
                  {subcategoryErrors.name_sk}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Hlavná kategória</Label>
              <Select
                value={subcategoryForm.category}
                onValueChange={(value) =>
                  setSubcategoryForm((previous) => ({
                    ...previous,
                    category: value as BookingMainCategory,
                  }))
                }
              >
                <SelectTrigger className="border-primary/10 bg-background/50">
                  <SelectValue placeholder="Vyberte kategóriu" />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_MAIN_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-primary/10 bg-background/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Aktívna podkategória</p>
                <p className="text-xs text-muted-foreground">
                  Neaktívna sa v bookingu nezobrazí, ale dáta zostanú zachované.
                </p>
              </div>
              <Switch
                checked={subcategoryForm.is_active}
                onCheckedChange={(checked) =>
                  setSubcategoryForm((previous) => ({ ...previous, is_active: checked }))
                }
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setSubcategoryDialogOpen(false)}
              className="rounded-xl font-semibold hover:bg-muted"
            >
              Zrušiť
            </Button>
            <Button
              onClick={() => void handleSaveSubcategory()}
              disabled={savingSubcategory}
              className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
            >
              {savingSubcategory ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ukladám...
                </>
              ) : editingSubcategory ? (
                "Uložiť zmeny"
              ) : (
                "Vytvoriť podkategóriu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

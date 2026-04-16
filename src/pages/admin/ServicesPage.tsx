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
import {
  formatServiceSubcategoryAuditField,
  getServiceSubcategoryAuditActionLabel,
  normalizeServiceSubcategoryAudit,
  resolveServiceSubcategoryAuditName,
  sortServiceSubcategoryAudit,
  type ServiceSubcategoryAuditAction,
  type ServiceSubcategoryAuditRow,
} from "@/lib/serviceSubcategoryAudit";

const UNASSIGNED_SUBCATEGORY_VALUE = "__none__";
const UNASSIGNED_SUBCATEGORY_LABEL = "Bez podkategórie";
const SORT_STEP = 100;
const AUDIT_FETCH_LIMIT = 100;

type AuditActionFilter = ServiceSubcategoryAuditAction | "all";
type AuditWindowFilter = "all" | "24h" | "7d" | "30d";

const AUDIT_ACTION_FILTERS: Array<{ value: AuditActionFilter; label: string }> = [
  { value: "all", label: "Všetko" },
  { value: "create", label: getServiceSubcategoryAuditActionLabel("create") },
  { value: "update", label: getServiceSubcategoryAuditActionLabel("update") },
  { value: "reorder", label: getServiceSubcategoryAuditActionLabel("reorder") },
  { value: "delete", label: getServiceSubcategoryAuditActionLabel("delete") },
];

const AUDIT_WINDOW_FILTERS: Array<{ value: AuditWindowFilter; label: string }> = [
  { value: "all", label: "Celé obdobie" },
  { value: "24h", label: "24 hod." },
  { value: "7d", label: "7 dní" },
  { value: "30d", label: "30 dní" },
];

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

function formatAuditTimestamp(value: string | null) {
  if (!value) return "Čas neznámy";

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Čas neznámy";

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function getAuditActorLabel(entry: ServiceSubcategoryAuditRow) {
  if (entry.actor_auth_id) {
    return `${entry.actor_auth_type ?? "auth"}:${entry.actor_auth_id}`;
  }

  return "Systémový trigger";
}

function getAuditSummary(entry: ServiceSubcategoryAuditRow) {
  const category = entry.after?.category ?? entry.before?.category;
  const categoryLabel =
    category === "damske" || category === "panske" ? getCategoryLabel(category) : null;

  switch (entry.action) {
    case "create":
      return categoryLabel
        ? `Podkategória bola vytvorená v sekcii ${categoryLabel.toLowerCase()}.`
        : "Podkategória bola vytvorená.";
    case "delete":
      return "Podkategória bola odstránená z katalógu a auditne zaznamenaná.";
    case "reorder":
      return `Poradie sa zmenilo z ${entry.before?.sort_order ?? "?"} na ${
        entry.after?.sort_order ?? "?"
      }.`;
    case "update":
    default:
      return entry.changed_fields.length > 0
        ? `Zmenené polia: ${entry.changed_fields
            .map((field) => formatServiceSubcategoryAuditField(field))
            .join(", ")}.`
        : "Podkategória bola aktualizovaná.";
  }
}

function isAuditEntryInsideWindow(entry: ServiceSubcategoryAuditRow, window: AuditWindowFilter) {
  if (window === "all") return true;
  if (!entry.created_at) return false;

  const timestamp = new Date(entry.created_at);
  if (Number.isNaN(timestamp.getTime())) return false;

  const now = Date.now();
  const ageMs = now - timestamp.getTime();

  switch (window) {
    case "24h":
      return ageMs <= 24 * 60 * 60 * 1000;
    case "7d":
      return ageMs <= 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return ageMs <= 30 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
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
  const [auditEntries, setAuditEntries] = useState<ServiceSubcategoryAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
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
  const [auditActionFilter, setAuditActionFilter] = useState<AuditActionFilter>("all");
  const [auditWindowFilter, setAuditWindowFilter] = useState<AuditWindowFilter>("all");
  const [auditSearch, setAuditSearch] = useState("");

  const load = async () => {
    if (!businessId) {
      setServices([]);
      setServiceSubcategories([]);
      setAuditEntries([]);
      setLoading(false);
      setAuditLoading(false);
      setAuditError(null);
      return;
    }

    setLoading(true);
    setAuditLoading(true);
    setAuditError(null);

    try {
      const [catalogResult, auditResult] = await Promise.allSettled([
        Promise.all([
          getDocs(query(collection(db, "services"), where("business_id", "==", businessId))),
          getDocs(
            query(collection(db, "service_subcategories"), where("business_id", "==", businessId)),
          ),
        ]),
        getDocs(
          query(
            collection(db, "service_subcategory_audit"),
            where("business_id", "==", businessId),
            limit(AUDIT_FETCH_LIMIT),
          ),
        ),
      ]);

      if (catalogResult.status !== "fulfilled") {
        throw catalogResult.reason;
      }

      const [servicesSnap, subcategoriesSnap] = catalogResult.value;

      setServices(servicesSnap.docs.map(normalizeService));
      setServiceSubcategories(
        sortServiceSubcategories(subcategoriesSnap.docs.map(normalizeServiceSubcategory)),
      );

      if (auditResult.status === "fulfilled") {
        setAuditEntries(
          sortServiceSubcategoryAudit(
            auditResult.value.docs.map(normalizeServiceSubcategoryAudit),
          ),
        );
      } else {
        console.error("ServicesPage: error loading service subcategory audit", auditResult.reason);
        setAuditEntries([]);
        setAuditError("Históriu zmien sa nepodarilo načítať. Katalóg služieb však funguje ďalej.");
      }
    } catch (error) {
      console.error("ServicesPage: error loading services", error);
      toast.error("Nepodarilo sa načítať katalóg služieb");
    } finally {
      setLoading(false);
      setAuditLoading(false);
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

  const filteredAuditEntries = useMemo(() => {
    const normalizedSearch = auditSearch.trim().toLowerCase();

    return auditEntries.filter((entry) => {
      if (auditActionFilter !== "all" && entry.action !== auditActionFilter) {
        return false;
      }

      if (!isAuditEntryInsideWindow(entry, auditWindowFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        resolveServiceSubcategoryAuditName(entry),
        entry.before?.name_sk,
        entry.after?.name_sk,
        entry.before?.slug,
        entry.after?.slug,
      ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [auditActionFilter, auditEntries, auditSearch, auditWindowFilter]);

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

  const renderAuditEntry = (entry: ServiceSubcategoryAuditRow) => {
    const subcategoryName = resolveServiceSubcategoryAuditName(entry);

    return (
      <article
        key={entry.id}
        className="rounded-3xl border border-primary/10 bg-card/40 p-5 backdrop-blur-xl"
        data-testid={`service-subcategory-audit-${entry.id}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border-primary/20 bg-primary/5 text-primary",
                  entry.action === "delete" &&
                    "border-destructive/20 bg-destructive/10 text-destructive",
                  entry.action === "reorder" &&
                    "border-amber-500/20 bg-amber-500/10 text-amber-600",
                )}
              >
                {getServiceSubcategoryAuditActionLabel(entry.action)}
              </Badge>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {formatAuditTimestamp(entry.created_at)}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{subcategoryName}</h3>
              <p className="text-sm text-muted-foreground">{getAuditSummary(entry)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-[0.2em] text-foreground/70">Zdroj</p>
            <p className="mt-1">{getAuditActorLabel(entry)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {entry.changed_fields.length > 0 ? (
            entry.changed_fields.map((field) => (
              <Badge
                key={`${entry.id}-${field}`}
                variant="secondary"
                className="rounded-full bg-muted/70 text-xs font-medium text-foreground/80"
              >
                {formatServiceSubcategoryAuditField(field)}
              </Badge>
            ))
          ) : (
            <Badge
              variant="secondary"
              className="rounded-full bg-muted/70 text-xs font-medium text-foreground/80"
            >
              Bez detailných zmien
            </Badge>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="animate-in fade-in space-y-6 duration-500" data-testid="admin-services-page">
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
            data-testid="create-subcategory-button"
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
                        data-testid={
                          linkedSubcategory
                            ? `service-subcategory-group-${linkedSubcategory.id}`
                            : undefined
                        }
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
                                data-testid={`subcategory-move-up-${linkedSubcategory.id}`}
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
                                data-testid={`subcategory-move-down-${linkedSubcategory.id}`}
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
                                data-testid={`subcategory-edit-${linkedSubcategory.id}`}
                                onClick={() => openEditSubcategory(linkedSubcategory)}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Upraviť
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                                data-testid={`subcategory-delete-${linkedSubcategory.id}`}
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

      <section
        className="rounded-[2rem] border border-primary/10 bg-card/30 p-6 backdrop-blur-xl"
        data-testid="service-subcategory-audit-history"
      >
        <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">História zmien podkategórií</h2>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                {filteredAuditEntries.length}/{auditEntries.length}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Auditný prehľad create, update, reorder a delete operácií nad
              `service_subcategories`. Katalóg služieb ostáva funkčný aj keď auditná
              história dočasne zlyhá.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start rounded-xl border-primary/20"
            onClick={() => void load()}
            disabled={loading || auditLoading}
          >
            {auditLoading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Obnovujem
              </>
            ) : (
              "Obnoviť históriu"
            )}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-primary/10 bg-background/40 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {AUDIT_ACTION_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={auditActionFilter === filter.value ? "default" : "ghost"}
                    className="rounded-full"
                    data-testid={`audit-action-filter-${filter.value}`}
                    onClick={() => setAuditActionFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              <Input
                value={auditSearch}
                onChange={(event) => setAuditSearch(event.target.value)}
                placeholder="Filtrovať podľa názvu podkategórie..."
                className="w-full max-w-sm border-primary/10 bg-background/60 lg:w-80"
                data-testid="audit-search-input"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {AUDIT_WINDOW_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={auditWindowFilter === filter.value ? "secondary" : "ghost"}
                  className="rounded-full"
                  data-testid={`audit-window-filter-${filter.value}`}
                  onClick={() => setAuditWindowFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {auditLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/20 bg-background/30 px-6 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-sm text-muted-foreground">Načítavam auditnú históriu...</p>
              </div>
            ) : auditError ? (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-700">
                {auditError}
              </div>
            ) : filteredAuditEntries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-primary/20 bg-background/30 px-6 py-12 text-center">
                <p className="text-base font-semibold text-foreground">
                  Auditná história zatiaľ neobsahuje záznamy pre aktuálny filter.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Skúste rozšíriť časové okno alebo resetovať filtre.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAuditEntries.slice(0, 24).map((entry) => renderAuditEntry(entry))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-primary/10 bg-background/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Rýchly súhrn
              </p>
              <div className="mt-4 space-y-3">
                {AUDIT_ACTION_FILTERS.filter((filter) => filter.value !== "all").map((filter) => {
                  const count = auditEntries.filter((entry) => entry.action === filter.value).length;

                  return (
                    <div
                      key={`summary-${filter.value}`}
                      className="flex items-center justify-between rounded-2xl border border-primary/10 bg-card/40 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">{filter.label}</span>
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-primary/10 bg-background/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Poznámka
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Aktuálne audit zapisuje systémový Firestore trigger. Keď neskôr doplníme
                explicitný actor context, táto sekcia začne ukazovať aj konkrétneho
                používateľa alebo službu, ktorá zmenu vykonala.
              </p>
            </div>
          </aside>
        </div>
      </section>

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
                data-testid="subcategory-name-input"
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
                aria-label="subcategory-active-toggle"
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
              data-testid="subcategory-save-button"
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

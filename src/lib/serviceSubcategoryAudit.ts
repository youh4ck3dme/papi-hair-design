export type ServiceSubcategoryAuditAction = "create" | "update" | "delete" | "reorder";

export interface ServiceSubcategoryAuditSnapshot {
  id: string;
  business_id: string | null;
  category: "damske" | "panske" | null;
  name_sk: string | null;
  slug: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

export interface ServiceSubcategoryAuditRow {
  id: string;
  business_id: string | null;
  subcategory_id: string | null;
  action: ServiceSubcategoryAuditAction;
  changed_fields: string[];
  before: ServiceSubcategoryAuditSnapshot | null;
  after: ServiceSubcategoryAuditSnapshot | null;
  actor_auth_type: string | null;
  actor_auth_id: string | null;
  created_at: string | null;
}

const ACTION_LABELS: Record<ServiceSubcategoryAuditAction, string> = {
  create: "Vytvorenie",
  update: "Úprava",
  reorder: "Presun",
  delete: "Zmazanie",
};

const FIELD_LABELS: Record<string, string> = {
  business_id: "Business",
  category: "Hlavná kategória",
  name_sk: "Názov",
  slug: "Slug",
  sort_order: "Poradie",
  is_active: "Aktivita",
};

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeCategory(value: unknown): "damske" | "panske" | null {
  if (value === "damske" || value === "panske") return value;
  return null;
}

function normalizeSnapshot(value: unknown): ServiceSubcategoryAuditSnapshot | null {
  if (!value || typeof value !== "object") return null;

  const snapshot = value as Record<string, unknown>;
  const id = toNullableString(snapshot.id);
  if (!id) return null;

  return {
    id,
    business_id: toNullableString(snapshot.business_id),
    category: normalizeCategory(snapshot.category),
    name_sk: toNullableString(snapshot.name_sk),
    slug: toNullableString(snapshot.slug),
    sort_order: toNullableNumber(snapshot.sort_order),
    is_active: toNullableBoolean(snapshot.is_active),
  };
}

export function normalizeServiceSubcategoryAudit(docSnap: {
  id: string;
  data: () => Record<string, unknown>;
}): ServiceSubcategoryAuditRow {
  const audit = docSnap.data();

  return {
    id: docSnap.id,
    business_id: toNullableString(audit.business_id),
    subcategory_id: toNullableString(audit.subcategory_id),
    action: audit.action === "create" || audit.action === "delete" || audit.action === "reorder"
      ? audit.action
      : "update",
    changed_fields: Array.isArray(audit.changed_fields)
      ? audit.changed_fields.filter((field): field is string => typeof field === "string")
      : [],
    before: normalizeSnapshot(audit.before),
    after: normalizeSnapshot(audit.after),
    actor_auth_type: toNullableString(audit.actor_auth_type),
    actor_auth_id: toNullableString(audit.actor_auth_id),
    created_at: toNullableString(audit.created_at),
  };
}

export function sortServiceSubcategoryAudit(entries: ServiceSubcategoryAuditRow[]) {
  return [...entries].sort((left, right) =>
    String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")),
  );
}

export function getServiceSubcategoryAuditActionLabel(action: ServiceSubcategoryAuditAction) {
  return ACTION_LABELS[action];
}

export function formatServiceSubcategoryAuditField(field: string) {
  return FIELD_LABELS[field] ?? field;
}

export function resolveServiceSubcategoryAuditName(entry: ServiceSubcategoryAuditRow) {
  return entry.after?.name_sk ?? entry.before?.name_sk ?? "Neznáma podkategória";
}

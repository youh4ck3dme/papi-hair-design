import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWrittenWithAuthContext } from "firebase-functions/v2/firestore";

type AuditAction = "create" | "update" | "delete" | "reorder";

interface ServiceSubcategoryAuditSnapshot {
  id: string;
  business_id: string | null;
  category: string | null;
  name_sk: string | null;
  slug: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

interface ServiceSubcategoryAuditEntry {
  business_id: string | null;
  subcategory_id: string;
  action: AuditAction;
  changed_fields: string[];
  before: ServiceSubcategoryAuditSnapshot | null;
  after: ServiceSubcategoryAuditSnapshot | null;
}

const AUDITED_FIELDS = [
  "business_id",
  "category",
  "name_sk",
  "slug",
  "sort_order",
  "is_active",
] as const;

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeSnapshot(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined,
): ServiceSubcategoryAuditSnapshot | null {
  if (!data) return null;

  return {
    id,
    business_id: toNullableString(data.business_id),
    category: toNullableString(data.category),
    name_sk: toNullableString(data.name_sk),
    slug: toNullableString(data.slug),
    sort_order: toNullableNumber(data.sort_order),
    is_active: toNullableBoolean(data.is_active),
  };
}

export function buildServiceSubcategoryAuditEntry(
  before:
    | { id: string; data(): FirebaseFirestore.DocumentData | undefined }
    | null
    | undefined,
  after:
    | { id: string; data(): FirebaseFirestore.DocumentData | undefined }
    | null
    | undefined,
): ServiceSubcategoryAuditEntry | null {
  const beforeData = before ? normalizeSnapshot(before.id, before.data()) : null;
  const afterData = after ? normalizeSnapshot(after.id, after.data()) : null;
  const subcategoryId = afterData?.id ?? beforeData?.id;

  if (!subcategoryId) return null;

  if (!beforeData && afterData) {
    return {
      business_id: afterData.business_id,
      subcategory_id: afterData.id,
      action: "create",
      changed_fields: [...AUDITED_FIELDS],
      before: null,
      after: afterData,
    };
  }

  if (beforeData && !afterData) {
    return {
      business_id: beforeData.business_id,
      subcategory_id: beforeData.id,
      action: "delete",
      changed_fields: [...AUDITED_FIELDS],
      before: beforeData,
      after: null,
    };
  }

  if (!beforeData || !afterData) return null;

  const changedFields = AUDITED_FIELDS.filter((field) => beforeData[field] !== afterData[field]);
  if (changedFields.length === 0) return null;

  const action: AuditAction =
    changedFields.length === 1 && changedFields[0] === "sort_order" ? "reorder" : "update";

  return {
    business_id: afterData.business_id ?? beforeData.business_id,
    subcategory_id: afterData.id,
    action,
    changed_fields: changedFields,
    before: beforeData,
    after: afterData,
  };
}

export const onServiceSubcategoryAuditEvent = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "service_subcategories/{subcategoryId}" },
  async (event) => {
    const db = getFirestore();
    const before = event.data?.before;
    const after = event.data?.after;
    const auditEntry = buildServiceSubcategoryAuditEntry(before, after);

    if (!auditEntry) return;

    await db.collection("service_subcategory_audit").add({
      ...auditEntry,
      actor_auth_type: event.authType,
      actor_auth_id: event.authId ?? null,
      trigger_event_id: event.id,
      created_at: new Date().toISOString(),
    });
  },
);

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore, type QueryDocumentSnapshot, type WriteBatch } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as clientGetDoc } from "firebase/firestore";

import {
  findManagedServiceSubcategoryByName,
  getManagedServiceSubcategoryDefinitions,
  getManagedServiceSubcategoryId,
  resolveManagedServiceCategory,
  resolveManagedServiceSubcategoryForService,
} from "../src/lib/serviceSubcategoryBlueprint.ts";
import { type BookingMainCategory } from "../src/lib/serviceSubcategories.ts";

interface ScriptArgs {
  businessId: string;
  projectId: string | null;
  apply: boolean;
  rebuildSnapshot: boolean;
}

interface ServiceDoc {
  id: string;
  business_id: string;
  name_sk: string;
  category: string | null;
  subcategory: string | null;
  subcategory_id: string | null;
  sort_order?: number | null;
}

interface ExistingSubcategoryDoc {
  id: string;
  business_id: string;
  category: BookingMainCategory;
  name_sk: string;
  slug: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at?: unknown;
}

const BATCH_LIMIT = 400;
function readDotEnvMap() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return new Map<string, string>();

  const entries = new Map<string, string>();
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) return;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      entries.set(key, value);
    });
  return entries;
}

function readProjectIdFromDotEnv() {
  return readDotEnvMap().get("VITE_FIREBASE_PROJECT_ID") ?? null;
}

function readProjectIdFromFirebaseRc() {
  const firebaseRcPath = path.join(process.cwd(), ".firebaserc");
  if (!existsSync(firebaseRcPath)) return null;

  try {
    const parsed = JSON.parse(readFileSync(firebaseRcPath, "utf8")) as {
      projects?: { default?: string };
    };
    return parsed.projects?.default?.trim() || null;
  } catch {
    return null;
  }
}

function readProjectIdFromServiceAccount(filePath: string | undefined) {
  if (!filePath || !existsSync(filePath)) return null;

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as { project_id?: string };
    return parsed.project_id?.trim() || null;
  } catch {
    return null;
  }
}

function parseArgs(argv: string[]): ScriptArgs {
  const readValue = (flag: string) => {
    const direct = argv.find((arg) => arg.startsWith(`${flag}=`));
    if (direct) return direct.slice(flag.length + 1);
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const businessId =
    readValue("--businessId") ??
    process.env.BUSINESS_ID ??
    "papi-hair-design-main";
  const projectId =
    readValue("--projectId") ??
    readProjectIdFromDotEnv() ??
    readProjectIdFromFirebaseRc() ??
    process.env.VITE_FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    null;

  return {
    businessId,
    projectId,
    apply: argv.includes("--apply"),
    rebuildSnapshot: !argv.includes("--skipSnapshot"),
  };
}

function normalizeService(docSnap: QueryDocumentSnapshot): ServiceDoc {
  const data = docSnap.data() as Record<string, unknown>;
  return {
    id: docSnap.id,
    business_id: typeof data.business_id === "string" ? data.business_id : "",
    name_sk: typeof data.name_sk === "string" ? data.name_sk : "",
    category: typeof data.category === "string" ? data.category : null,
    subcategory: typeof data.subcategory === "string" ? data.subcategory : null,
    subcategory_id: typeof data.subcategory_id === "string" ? data.subcategory_id : null,
    sort_order: typeof data.sort_order === "number" ? data.sort_order : null,
  };
}

function normalizeExistingSubcategory(docSnap: QueryDocumentSnapshot): ExistingSubcategoryDoc {
  const data = docSnap.data() as Record<string, unknown>;
  const category = data.category === "panske" ? "panske" : "damske";
  return {
    id: docSnap.id,
    business_id: typeof data.business_id === "string" ? data.business_id : "",
    category,
    name_sk: typeof data.name_sk === "string" ? data.name_sk : "",
    slug: typeof data.slug === "string" ? data.slug : null,
    sort_order: typeof data.sort_order === "number" ? data.sort_order : null,
    is_active: data.is_active !== false,
    created_at: data.created_at,
  };
}

function chunkedCommit(operations: Array<(batch: WriteBatch) => void>, db: Firestore) {
  return (async () => {
    for (let index = 0; index < operations.length; index += BATCH_LIMIT) {
      const batch = db.batch();
      operations.slice(index, index + BATCH_LIMIT).forEach((applyOperation) => applyOperation(batch));
      await batch.commit();
    }
  })();
}

async function loadBusinessData(db: Firestore, businessId: string) {
  const [servicesSnap, subcategoriesSnap] = await Promise.all([
    db.collection("services").where("business_id", "==", businessId).get(),
    db.collection("service_subcategories").where("business_id", "==", businessId).get(),
  ]);

  return {
    services: servicesSnap.docs.map(normalizeService),
    existingSubcategories: subcategoriesSnap.docs.map(normalizeExistingSubcategory),
  };
}

async function rebuildPublicSnapshotForBusiness(db: Firestore, businessId: string) {
  const [bizDoc, servicesSnap, serviceSubcategoriesSnap, employeesSnap, hoursSnap, overridesSnap, employeeServicesSnap] =
    await Promise.all([
      db.collection("businesses").doc(businessId).get(),
      db.collection("services").where("business_id", "==", businessId).where("is_active", "==", true).get(),
      db.collection("service_subcategories").where("business_id", "==", businessId).where("is_active", "==", true).get(),
      db.collection("employees").where("business_id", "==", businessId).where("is_active", "==", true).get(),
      db.collection("business_hours").where("business_id", "==", businessId).get(),
      db.collection("business_date_overrides").where("business_id", "==", businessId).get(),
      db.collection("employee_services").get(),
    ]);

  const employeeIds = new Set(employeesSnap.docs.map((docSnap) => docSnap.id));
  const employeeServiceMap: Record<string, string[]> = {};

  employeeServicesSnap.forEach((docSnap) => {
    const row = docSnap.data() as { employee_id?: string; service_id?: string };
    if (!row.employee_id || !row.service_id || !employeeIds.has(row.employee_id)) return;
    if (!employeeServiceMap[row.employee_id]) {
      employeeServiceMap[row.employee_id] = [];
    }
    employeeServiceMap[row.employee_id].push(row.service_id);
  });

  const snapshot = {
    business: { id: bizDoc.id, ...bizDoc.data() },
    services: servicesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    service_subcategories: serviceSubcategoriesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    employees: employeesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    business_hours: hoursSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    date_overrides: overridesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    employee_service_map: employeeServiceMap,
    revision: Date.now(),
    updated_at: new Date().toISOString(),
    status: "ready" as const,
  };

  await db.collection("public_snapshots").doc(businessId).set(snapshot);
  await db.collection("ops_health").doc(`snapshot_${businessId}`).set({
    kind: "public_snapshot",
    business_id: businessId,
    status: "ready",
    revision: snapshot.revision,
    updated_at: snapshot.updated_at,
    error: null,
  });

  return snapshot.revision;
}

async function loadDryRunBusinessData(businessId: string) {
  const env = readDotEnvMap();
  const config = {
    apiKey: env.get("VITE_FIREBASE_API_KEY") ?? "",
    authDomain: env.get("VITE_FIREBASE_AUTH_DOMAIN") ?? "",
    projectId: env.get("VITE_FIREBASE_PROJECT_ID") ?? "",
    storageBucket: env.get("VITE_FIREBASE_STORAGE_BUCKET") ?? "",
    messagingSenderId: env.get("VITE_FIREBASE_MESSAGING_SENDER_ID") ?? "",
    appId: env.get("VITE_FIREBASE_APP_ID") ?? "",
    measurementId: env.get("VITE_FIREBASE_MEASUREMENT_ID") ?? "",
  };

  if (!config.projectId || !config.apiKey || !config.appId) {
    throw new Error("Dry-run requires Firebase web config in .env.");
  }

  const clientApp =
    getClientApps()[0] ??
    initializeClientApp(config, `service-subcategory-backfill-${config.projectId}`);
  const clientDb = getClientFirestore(clientApp);
  const snapshot = await clientGetDoc(clientDoc(clientDb, "public_snapshots", businessId));
  if (!snapshot.exists()) {
    throw new Error(`public_snapshots/${businessId} not found for dry-run.`);
  }

  const data = snapshot.data() as {
    services?: Array<Record<string, unknown>>;
    service_subcategories?: Array<Record<string, unknown>>;
  };

  return {
    services: (data.services ?? []).map((service) => ({
      id: typeof service.id === "string" ? service.id : "",
      business_id: typeof service.business_id === "string" ? service.business_id : businessId,
      name_sk: typeof service.name_sk === "string" ? service.name_sk : "",
      category: typeof service.category === "string" ? service.category : null,
      subcategory: typeof service.subcategory === "string" ? service.subcategory : null,
      subcategory_id: typeof service.subcategory_id === "string" ? service.subcategory_id : null,
      sort_order: typeof service.sort_order === "number" ? service.sort_order : null,
    })),
    existingSubcategories: (data.service_subcategories ?? []).map((subcategory) => ({
      id: typeof subcategory.id === "string" ? subcategory.id : "",
      business_id: typeof subcategory.business_id === "string" ? subcategory.business_id : businessId,
      category: subcategory.category === "panske" ? "panske" : "damske",
      name_sk: typeof subcategory.name_sk === "string" ? subcategory.name_sk : "",
      slug: typeof subcategory.slug === "string" ? subcategory.slug : null,
      sort_order: typeof subcategory.sort_order === "number" ? subcategory.sort_order : null,
      is_active: subcategory.is_active !== false,
      created_at: subcategory.created_at,
    })),
  };
}

function getExistingSubcategoryLookup(existingSubcategories: ExistingSubcategoryDoc[]) {
  const lookup = new Map<string, ExistingSubcategoryDoc>();

  existingSubcategories.forEach((subcategory) => {
    if (subcategory.slug) {
      lookup.set(`${subcategory.category}|${subcategory.slug}`, subcategory);
    }

    const matchedByName = findManagedServiceSubcategoryByName(subcategory.category, subcategory.name_sk);
    if (matchedByName) {
      lookup.set(`${subcategory.category}|${matchedByName.slug}`, subcategory);
    }
  });

  return lookup;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const targetProjectId = args.projectId;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentialsProjectId = readProjectIdFromServiceAccount(credentialsPath);

  if (
    targetProjectId &&
    credentialsProjectId &&
    credentialsProjectId !== targetProjectId
  ) {
    console.warn(
      `backfill-service-subcategories: ignoring GOOGLE_APPLICATION_CREDENTIALS for project ${credentialsProjectId}; target project is ${targetProjectId}.`,
    );
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (!getApps().length) {
    initializeApp(args.projectId ? { projectId: args.projectId } : undefined);
  }

  const db = getFirestore();
  const nowIso = new Date().toISOString();
  const { services, existingSubcategories } = args.apply
    ? await loadBusinessData(db, args.businessId)
    : await loadDryRunBusinessData(args.businessId);
  const existingLookup = getExistingSubcategoryLookup(existingSubcategories);

  const managedDefinitions = [
    ...getManagedServiceSubcategoryDefinitions("damske"),
    ...getManagedServiceSubcategoryDefinitions("panske"),
  ];

  const subcategoryDocIds = new Map<string, string>();
  const subcategoryOperations: Array<(batch: WriteBatch) => void> = [];

  managedDefinitions.forEach((definition) => {
    const key = `${definition.category}|${definition.slug}`;
    const existing = existingLookup.get(key);
    const docId = existing?.id ?? getManagedServiceSubcategoryId(args.businessId, definition);
    subcategoryDocIds.set(key, docId);

    const payload: Record<string, unknown> = {
      business_id: args.businessId,
      category: definition.category,
      name_sk: definition.name_sk,
      slug: definition.slug,
      sort_order: definition.sort_order,
      is_active: true,
      updated_at: nowIso,
    };

    if (!existing?.created_at) {
      payload.created_at = nowIso;
    }

    if (args.apply) {
      subcategoryOperations.push((batch) => {
        batch.set(
          db.collection("service_subcategories").doc(docId),
          payload,
          { merge: true },
        );
      });
    }
  });

  const unresolvedServices: Array<{
    id: string;
    name_sk: string;
    category: BookingMainCategory;
    current_subcategory: string | null;
  }> = [];

  const serviceOperations: Array<(batch: WriteBatch) => void> = [];
  let serviceUpdateCount = 0;

  services.forEach((service) => {
    const resolvedCategory = resolveManagedServiceCategory(service);
    const resolvedSubcategory = resolveManagedServiceSubcategoryForService(service);
    const desiredSubcategoryId = resolvedSubcategory
      ? subcategoryDocIds.get(`${resolvedCategory}|${resolvedSubcategory.slug}`) ?? null
      : null;
    const desiredSubcategoryName = resolvedSubcategory?.name_sk ?? null;

    if (!resolvedSubcategory) {
      unresolvedServices.push({
        id: service.id,
        name_sk: service.name_sk,
        category: resolvedCategory,
        current_subcategory: service.subcategory,
      });
    }

    const needsUpdate =
      service.category !== resolvedCategory ||
      (service.subcategory_id ?? null) !== desiredSubcategoryId ||
      (service.subcategory ?? null) !== desiredSubcategoryName;

    if (!needsUpdate) {
      return;
    }

    serviceUpdateCount += 1;
    if (args.apply) {
      serviceOperations.push((batch) => {
        batch.set(
          db.collection("services").doc(service.id),
          {
            category: resolvedCategory,
            subcategory_id: desiredSubcategoryId,
            subcategory: desiredSubcategoryName,
            updated_at: nowIso,
          },
          { merge: true },
        );
      });
    }
  });

  const summary = {
    businessId: args.businessId,
    projectId: args.projectId,
    apply: args.apply,
    rebuildSnapshot: args.rebuildSnapshot,
    totalServices: services.length,
    managedSubcategories: managedDefinitions.map((definition) => ({
      category: definition.category,
      name_sk: definition.name_sk,
      slug: definition.slug,
      sort_order: definition.sort_order,
      docId: subcategoryDocIds.get(`${definition.category}|${definition.slug}`) ?? null,
    })),
    serviceUpdatesPlanned: serviceUpdateCount,
    unresolvedServices,
  };

  if (!args.apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await chunkedCommit(subcategoryOperations, db);
  await chunkedCommit(serviceOperations, db);

  let snapshotRevision: number | null = null;
  if (args.rebuildSnapshot) {
    snapshotRevision = await rebuildPublicSnapshotForBusiness(db, args.businessId);
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        subcategoriesUpserted: subcategoryOperations.length,
        servicesUpdated: serviceUpdateCount,
        snapshotRevision,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Missing or insufficient permissions")) {
    console.error(
      "backfill-service-subcategories: Firestore apply mode needs credentials for the target project. " +
      "This workstation currently points GOOGLE_APPLICATION_CREDENTIALS at a different Firebase project and has no compatible ADC context for writes.",
    );
  }
  console.error("backfill-service-subcategories failed", error);
  process.exitCode = 1;
});

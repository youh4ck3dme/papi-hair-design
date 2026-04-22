import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import { timingSafeEqual } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const COLLECTIONS = [
    "profiles",
    "memberships",
    "businesses",
    "services",
    "service_subcategories",
    "employees",
    "employee_services",
    "appointments"
] as const;

const TIMESTAMP_KEYS = ["created_at", "updated_at", "start_at", "end_at", "expires_at"];
const BATCH_SIZE = 400;

async function clearCollection(
    db: FirebaseFirestore.Firestore,
    collectionName: string
): Promise<void> {
    const col = db.collection(collectionName);
    for (;;) {
        const snap = await col.limit(BATCH_SIZE).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
}

interface ImportMigrationDataRequest {
    adminSecret?: string;
}

interface ImportResult {
    [collection: string]: number;
}

export function hasMatchingAdminSecret(providedSecret: string | undefined, expectedSecret: string): boolean {
    const normalizedProvided = typeof providedSecret === "string" ? providedSecret.trim() : "";
    const providedBuffer = Buffer.from(normalizedProvided, "utf8");
    const expectedBuffer = Buffer.from(expectedSecret, "utf8");

    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
}

function cleanItemForFirestore(item: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = { ...item };
    for (const key of TIMESTAMP_KEYS) {
        const val = clean[key];
        if (val && typeof val === "string") {
            const date = new Date(val);
            if (!Number.isNaN(date.getTime())) {
                clean[key] = admin.firestore.Timestamp.fromDate(date);
            }
        }
    }
    return clean;
}

async function importCollection(
    db: FirebaseFirestore.Firestore,
    dataDir: string,
    collectionName: string
): Promise<number> {
    const filePath = path.join(dataDir, `${collectionName}.json`);
    if (!fs.existsSync(filePath)) {
        await clearCollection(db, collectionName);
        return 0;
    }
    await clearCollection(db, collectionName);

    let items: unknown[];
    try {
        const rawData = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(rawData);
        if (!Array.isArray(parsed)) return 0;
        items = parsed;
    } catch {
        return 0;
    }

    let count = 0;
    let batch = db.batch();
    for (const item of items as Record<string, unknown>[]) {
        if (!item || typeof item !== "object" || !item.id) continue;
        const id = item.id != null ? String(item.id) : "";
        if (!id) continue;
        const docRef = db.collection(collectionName).doc(id);
        batch.set(docRef, cleanItemForFirestore(item));
        count++;
        if (count % BATCH_SIZE === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (count % BATCH_SIZE !== 0) await batch.commit();
    return count;
}

export const importMigrationData = functions.https.onCall(
    { region: "europe-west1" },
    async (request: CallableRequest<ImportMigrationDataRequest>): Promise<ImportResult> => {
        const secret = process.env.IMPORT_MIGRATION_SECRET?.trim();
        if (!secret) {
            throw new HttpsError(
                "failed-precondition",
                "Import is disabled: IMPORT_MIGRATION_SECRET is not configured. Set it in Firebase Functions config to enable."
            );
        }
        if (!hasMatchingAdminSecret(request.data?.adminSecret, secret)) {
            throw new HttpsError("permission-denied", "Admin secret required to run import");
        }

        const db = getFirestore();
        const dataDir = path.join(__dirname, "..", "migration_data");
        if (!fs.existsSync(dataDir)) {
            throw new HttpsError(
                "failed-precondition",
                `migration_data directory not found at ${dataDir}. Add functions/migration_data/ with collection JSON files.`
            );
        }

        const results: ImportResult = {};
        for (const collectionName of COLLECTIONS) {
            results[collectionName] = await importCollection(db, dataDir, collectionName);
        }
        return results;
    }
);

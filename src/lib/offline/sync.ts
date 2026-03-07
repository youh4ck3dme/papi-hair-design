import { getDB, type OfflineAction } from "./db";
import { functions } from "@/integrations/firebase/config";
import { httpsCallable } from "firebase/functions";

function getAppointmentId(action: OfflineAction): string | undefined {
  if ("payload" in action && action.payload && "id" in action.payload) {
    return action.payload.id;
  }
  return undefined;
}

interface SyncResponse {
  success: boolean;
  server_timestamp?: string;
  pulled?: {
    appointments?: any[];
  };
  applied?: number;
  conflicts?: Array<{
    idempotency_key: string;
    reason: string;
    server_suggestion?: { start_at: string; end_at: string };
  }>;
  appointments?: any[];
  error?: string;
}

interface SyncChange {
  table: "appointments";
  id: string;
  data?: Record<string, unknown>;
  deleted?: boolean;
}

function actionToSyncChange(action: OfflineAction, businessId: string): SyncChange | null {
  if (action.type === "APPOINTMENT_CREATE") {
    const id = action.payload.id;
    if (!id) return null;
    return {
      table: "appointments",
      id,
      data: {
        ...action.payload,
        business_id: businessId,
      },
    };
  }

  if (action.type === "APPOINTMENT_UPDATE") {
    const id = action.payload.id;
    if (!id) return null;
    return {
      table: "appointments",
      id,
      data: {
        ...action.payload,
        business_id: businessId,
      },
    };
  }

  if (action.type === "APPOINTMENT_CANCEL") {
    const id = action.payload.id;
    if (!id) return null;
    return {
      table: "appointments",
      id,
      data: {
        business_id: businessId,
        status: "cancelled",
        note: action.payload.reason,
      },
    };
  }

  return null;
}

async function getLastSyncTimestamp(db: Awaited<ReturnType<typeof getDB>>): Promise<string | undefined> {
  const row = await db.get("meta", "last_sync_timestamp");
  if (row && typeof row.value === "string" && row.value.length > 0) {
    return row.value;
  }
  return undefined;
}

async function setLastSyncTimestamp(db: Awaited<ReturnType<typeof getDB>>, value: string | undefined): Promise<void> {
  if (!value) return;
  await db.put("meta", { key: "last_sync_timestamp", value });
}

export async function runSync(businessId: string) {
  if (!businessId) return;

  let db;
  try {
    db = await getDB();
  } catch {
    return;
  }

  const allQueue = await db.getAllFromIndex("queue", "status");
  const pending = allQueue.filter((i: { status: string }) => i.status === "pending" || i.status === "failed");
  const lastSyncTimestamp = await getLastSyncTimestamp(db);

  const syncOfflineDataFn = httpsCallable<any, SyncResponse>(functions, "syncOfflineData");

  if (pending.length) {
    for (const item of pending) {
      if (!item.id) continue;
      await db.put("queue", { ...item, status: "processing", last_error: undefined });
      try {
        const change = actionToSyncChange(item.action, businessId);
        if (!change) {
          await db.put("queue", { ...item, status: "failed", last_error: "invalid offline action payload" });
          continue;
        }

        const { data: resp } = await syncOfflineDataFn({
          business_id: businessId,
          changes: [change],
          last_sync_timestamp: lastSyncTimestamp,
        });

        if (resp?.success) {
          if (resp.conflicts?.length) {
            const conflict = resp.conflicts[0];
            await db.put("queue", {
              ...item,
              status: "conflict",
              last_error: conflict.reason,
              conflict_suggestion: conflict.server_suggestion,
              appointment_id: getAppointmentId(item.action),
            });
          } else {
            await db.put("queue", { ...item, status: "done" });
          }
          await setLastSyncTimestamp(db, resp.server_timestamp);
        } else {
          await db.put("queue", { ...item, status: "failed", last_error: resp?.error ?? "sync failed" });
        }
      } catch (e: unknown) {
        await db.put("queue", { ...item, status: "failed", last_error: (e as Error)?.message ?? "network error" });
      }
    }
  }

  try {
    // Also pull latest updates
    const { data } = await syncOfflineDataFn({
      business_id: businessId,
      last_sync_timestamp: lastSyncTimestamp,
      days: 2,
    });

    const appointments = data?.pulled?.appointments ?? data?.appointments;
    if (data?.success && appointments && Array.isArray(appointments)) {
      const tx = db.transaction("appointments", "readwrite");
      for (const a of appointments) {
        await tx.store.put({ ...a, synced: true });
      }
      await tx.done;
      await setLastSyncTimestamp(db, data.server_timestamp);
    }
  } catch {
    // ignore pull errors when offline
  }
}

export function installAutoSync(businessId: string) {
  if (!businessId) return;
  if (typeof window === "undefined") return;
  const kick = () => {
    if (navigator.onLine) runSync(businessId);
  };
  window.addEventListener("online", kick);
  const t = setInterval(kick, 30_000);
  return () => {
    window.removeEventListener("online", kick);
    clearInterval(t);
  };
}

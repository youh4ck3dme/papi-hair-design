import { getDB, type OfflineAction } from "./db";
import { functions } from "@/integrations/firebase/config";
import { httpsCallable } from "firebase/functions";

interface SyncRequest {
  business_id: string;
  last_sync_timestamp?: string;
  changes?: Array<{ table: string; id: string; data: Record<string, unknown>; deleted?: boolean }>;
}

interface SyncResponse {
  success: boolean;
  server_timestamp?: string;
  pulled?: {
    appointments: any[];
  };
  error?: string;
}

function actionToChange(
  action: OfflineAction
): { table: string; id: string; data: Record<string, unknown>; deleted?: boolean } | null {
  switch (action.type) {
    case "APPOINTMENT_CREATE":
    case "APPOINTMENT_UPDATE":
      return { table: "appointments", id: action.payload.id, data: action.payload as unknown as Record<string, unknown> };
    case "APPOINTMENT_CANCEL":
      return { table: "appointments", id: action.payload.id, data: { status: "cancelled", reason: action.payload.reason } };
    default:
      return null;
  }
}

export async function runSync(businessId?: string) {
  let db;
  try {
    db = await getDB();
  } catch {
    return;
  }

  // Resolve business_id: prefer caller-supplied value, fall back to meta store
  let business_id = businessId;
  if (!business_id) {
    try {
      const meta = await db.get("meta", "business_id");
      business_id = meta?.value as string | undefined;
    } catch {
      // ignore
    }
  }
  if (!business_id) return;

  // Persist resolved business_id so future no-arg calls can reuse it
  try {
    await db.put("meta", { key: "business_id", value: business_id });
  } catch {
    // ignore
  }

  const allQueue = await db.getAllFromIndex("queue", "status");
  const pending = allQueue.filter((i: { status: string }) => i.status === "pending" || i.status === "failed");

  const syncOfflineDataFn = httpsCallable<SyncRequest, SyncResponse>(functions, "syncOfflineData");

  if (pending.length) {
    for (const item of pending) {
      if (!item.id) continue;
      await db.put("queue", { ...item, status: "processing", last_error: undefined });
      const change = actionToChange(item.action);
      if (!change) {
        await db.put("queue", { ...item, status: "failed", last_error: "unknown action type" });
        continue;
      }
      try {
        const { data: resp } = await syncOfflineDataFn({ business_id, changes: [change] });

        if (resp?.success) {
          await db.put("queue", { ...item, status: "done" });
        } else {
          await db.put("queue", { ...item, status: "failed", last_error: resp?.error ?? "sync failed" });
        }
      } catch (e: unknown) {
        await db.put("queue", { ...item, status: "failed", last_error: (e as Error)?.message ?? "network error" });
      }
    }
  }

  try {
    // Pull updates since the last successful sync
    let last_sync_timestamp: string | undefined;
    try {
      const meta = await db.get("meta", "last_sync_timestamp");
      last_sync_timestamp = meta?.value as string | undefined;
    } catch {
      // ignore
    }

    const { data } = await syncOfflineDataFn({ business_id, last_sync_timestamp });

    if (data?.success && data.pulled?.appointments && Array.isArray(data.pulled.appointments)) {
      const tx = db.transaction("appointments", "readwrite");
      for (const a of data.pulled.appointments) {
        await tx.store.put({ ...a, synced: true });
      }
      await tx.done;

      if (data.server_timestamp) {
        await db.put("meta", { key: "last_sync_timestamp", value: data.server_timestamp });
      }
    }
  } catch {
    // ignore pull errors when offline
  }
}

export function installAutoSync(businessId?: string) {
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

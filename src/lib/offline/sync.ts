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
  applied?: number;
  conflicts?: Array<{
    idempotency_key: string;
    reason: string;
    server_suggestion?: { start_at: string; end_at: string };
  }>;
  appointments?: any[];
  error?: string;
}

export async function runSync(businessId?: string) {
  let db;
  try {
    db = await getDB();
  } catch {
    return;
  }

  const allQueue = await db.getAllFromIndex("queue", "status");
  const pending = allQueue.filter((i: { status: string }) => i.status === "pending" || i.status === "failed");

  const syncOfflineDataFn = httpsCallable<any, SyncResponse>(functions, "syncOfflineData");

  if (pending.length) {
    for (const item of pending) {
      if (!item.id) continue;
      await db.put("queue", { ...item, status: "processing", last_error: undefined });
      try {
        const { data: resp } = await syncOfflineDataFn({
          actions: [item.action],
          ...(businessId ? { business_id: businessId } : {}),
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
        } else {
          await db.put("queue", { ...item, status: "failed", last_error: resp?.error ?? "sync failed" });
        }
      } catch (e: unknown) {
        await db.put("queue", { ...item, status: "failed", last_error: (e as Error)?.message ?? "network error" });
      }
    }
  }

  // Only pull if we have a business_id to scope the query and enforce access control
  if (businessId) {
    try {
      const { data } = await syncOfflineDataFn({ business_id: businessId, days: 2 });

      if (data?.success && data.appointments && Array.isArray(data.appointments)) {
        const tx = db.transaction("appointments", "readwrite");
        for (const a of data.appointments) {
          await tx.store.put({ ...a, synced: true });
        }
        await tx.done;
      }
    } catch {
      // ignore pull errors when offline
    }
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

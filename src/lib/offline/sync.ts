import { getDB, type OfflineAction } from "./db";
import { supabase } from "@/integrations/supabase/client";

function getAppointmentId(action: OfflineAction): string | undefined {
  if ("payload" in action && action.payload && "id" in action.payload) {
    return action.payload.id;
  }
  return undefined;
}

interface SyncResponse {
  ok: boolean;
  applied?: number;
  conflicts?: Array<{
    idempotency_key: string;
    reason: string;
    server_suggestion?: { start_at: string; end_at: string };
  }>;
  error?: string;
}

export async function runSync() {
  let db;
  try {
    db = await getDB();
  } catch {
    return;
  }

  const allQueue = await db.getAllFromIndex("queue", "status");
  const pending = allQueue.filter((i: { status: string }) => i.status === "pending" || i.status === "failed");

  if (pending.length) {
    for (const item of pending) {
      if (!item.id) continue;
      await db.put("queue", { ...item, status: "processing", last_error: undefined });
      try {
        const { data: resp, error } = await supabase.functions.invoke<SyncResponse>("sync-push", {
          body: { actions: [item.action] }
        });

        if (error) throw error;

        if (resp?.ok) {
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

  try {
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; appointments?: any[] }>("sync-pull", {
      body: { days: 2 }
    });

    if (error) throw error;

    if (data?.ok && data.appointments && Array.isArray(data.appointments)) {
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

export function installAutoSync() {
  if (typeof window === "undefined") return;
  const kick = () => {
    if (navigator.onLine) runSync();
  };
  window.addEventListener("online", kick);
  const t = setInterval(kick, 30_000);
  return () => {
    window.removeEventListener("online", kick);
    clearInterval(t);
  };
}

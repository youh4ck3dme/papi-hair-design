import * as functions from "firebase-functions/v2";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

interface GetPublicAvailabilityConflictsInput {
  business_id: string;
  employee_ids: string[];
  day_start: string;
  day_end: string;
}

interface AvailabilityConflict {
  employee_id: string;
  start_at: string;
  end_at: string;
  status: string | null;
  hold_expires_at: string | null;
}

export const getPublicAvailabilityConflicts = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<GetPublicAvailabilityConflictsInput>) => {
    const { business_id, employee_ids, day_start, day_end } = request.data ?? {};

    if (
      !business_id ||
      !Array.isArray(employee_ids) ||
      employee_ids.length === 0 ||
      !day_start ||
      !day_end
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const db = getFirestore();
    const uniqueEmployeeIds = [...new Set(employee_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
    if (!uniqueEmployeeIds.length) {
      return { conflicts: [] as AvailabilityConflict[] };
    }

    const conflicts: AvailabilityConflict[] = [];

    for (let index = 0; index < uniqueEmployeeIds.length; index += 10) {
      const batchIds = uniqueEmployeeIds.slice(index, index + 10);
      const snap = await db
        .collection("appointments")
        .where("business_id", "==", business_id)
        .where("employee_id", "in", batchIds)
        .where("start_at", ">=", day_start)
        .where("start_at", "<", day_end)
        .limit(200)
        .get();

      for (const docSnap of snap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        conflicts.push({
          employee_id: typeof data.employee_id === "string" ? data.employee_id : "",
          start_at: typeof data.start_at === "string" ? data.start_at : "",
          end_at: typeof data.end_at === "string" ? data.end_at : "",
          status: typeof data.status === "string" ? data.status : null,
          hold_expires_at: typeof data.hold_expires_at === "string" ? data.hold_expires_at : null,
        });
      }
    }

    return { conflicts };
  }
);

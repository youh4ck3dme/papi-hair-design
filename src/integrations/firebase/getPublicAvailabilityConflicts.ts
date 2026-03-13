import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export interface GetPublicAvailabilityConflictsBody {
  business_id: string;
  employee_ids: string[];
  day_start: string;
  day_end: string;
}

export interface PublicAvailabilityConflict {
  employee_id: string;
  start_at: string;
  end_at: string;
  status: string | null;
  hold_expires_at: string | null;
}

interface GetPublicAvailabilityConflictsResponse {
  conflicts?: PublicAvailabilityConflict[];
}

export async function getPublicAvailabilityConflicts(
  body: GetPublicAvailabilityConflictsBody
): Promise<PublicAvailabilityConflict[]> {
  const fn = httpsCallable<
    GetPublicAvailabilityConflictsBody,
    GetPublicAvailabilityConflictsResponse
  >(functions, "getPublicAvailabilityConflicts");
  const result = await fn(body);
  return result.data.conflicts ?? [];
}

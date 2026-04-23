import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export type ClientDiagnosticCategory =
  | "runtime_error"
  | "unhandled_rejection"
  | "bootstrap_error";

export type ClientDiagnosticLevel = "error" | "warning";

export interface RecordClientDiagnosticBody {
  category: ClientDiagnosticCategory;
  message: string;
  level?: ClientDiagnosticLevel;
  route?: string | null;
  source?: string | null;
  stack?: string | null;
  session_id?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface RecordClientDiagnosticResponse {
  ok: boolean;
  id: string;
  fingerprint: string;
}

export async function recordClientDiagnostic(
  body: RecordClientDiagnosticBody,
): Promise<RecordClientDiagnosticResponse | null> {
  try {
    const fn = httpsCallable<RecordClientDiagnosticBody, RecordClientDiagnosticResponse>(
      functions,
      "recordClientDiagnostic",
    );
    const result = await fn(body);
    return result.data;
  } catch {
    return null;
  }
}

import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export interface QueueRegistrationWelcomeEmailBody {
  business_id?: string;
}

export interface QueueRegistrationWelcomeEmailResponse {
  success: boolean;
  queued: boolean;
  reason?: string | null;
}

export async function queueRegistrationWelcomeEmail(
  body: QueueRegistrationWelcomeEmailBody
): Promise<QueueRegistrationWelcomeEmailResponse> {
  const fn = httpsCallable<QueueRegistrationWelcomeEmailBody, QueueRegistrationWelcomeEmailResponse>(
    functions,
    "queueRegistrationWelcomeEmail"
  );
  const result = await fn(body);
  return result.data;
}

import * as functions from "firebase-functions/v2";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "./guards";
import { queueRegistrationWelcomeEmail as queueRegistrationWelcomeMessage } from "./emailQueue";
import { DEFAULT_BUSINESS_ID } from "./businessConfig";

interface QueueRegistrationWelcomeEmailData {
  business_id?: string;
}

export const queueRegistrationWelcomeEmail = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<QueueRegistrationWelcomeEmailData>) => {
    requireAuth(request.auth);

    const customerEmail = request.auth?.token.email;
    if (!customerEmail) {
      throw new HttpsError("failed-precondition", "Chýba e-mail používateľa");
    }

    const businessId = request.data?.business_id?.trim() || DEFAULT_BUSINESS_ID;
    const customerName = typeof request.auth?.token.name === "string" && request.auth.token.name.trim().length > 0
      ? request.auth.token.name.trim()
      : null;

    const result = await queueRegistrationWelcomeMessage({
      businessId,
      customerEmail,
      customerName,
    });

    return {
      success: true,
      queued: result.queued,
      reason: result.reason ?? null,
    };
  }
);

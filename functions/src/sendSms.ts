import * as functions from "firebase-functions/v2";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

interface SendSmsInput {
  to: string;
  message: string;
}

const twilioSidSecret = defineSecret("TWILIO_ACCOUNT_SID");
const twilioTokenSecret = defineSecret("TWILIO_AUTH_TOKEN");
const twilioFromSecret = defineSecret("TWILIO_FROM_NUMBER");

function assertEnv() {
  const twilioSid = twilioSidSecret.value();
  const twilioToken = twilioTokenSecret.value();
  const twilioFrom = twilioFromSecret.value();
  if (!twilioSid || !twilioToken || !twilioFrom) {
    throw new HttpsError("failed-precondition", "SMS brána nie je nastavená.");
  }
  return { twilioSid, twilioToken, twilioFrom };
}

function assertRole(request: CallableRequest<SendSmsInput>) {
  const role = request.auth?.token?.role as string | undefined;
  if (!role || !["owner", "admin"].includes(role)) {
    throw new HttpsError("permission-denied", "Nemáte oprávnenie posielať SMS.");
  }
}

export const sendSms = functions.https.onCall(
  {
    region: "europe-west1",
    secrets: [twilioSidSecret, twilioTokenSecret, twilioFromSecret],
  },
  async (request: CallableRequest<SendSmsInput>) => {
    assertRole(request);
    const { twilioSid, twilioToken, twilioFrom } = assertEnv();

    const to = request.data?.to?.trim();
    const message = request.data?.message?.trim();
    if (!to || !message) {
      throw new HttpsError("invalid-argument", "Chýba príjemca alebo text správy.");
    }

    const { Twilio } = await import("twilio");
    const client = new Twilio(twilioSid, twilioToken);
    try {
      const result = await client.messages.create({
        to,
        from: twilioFrom,
        body: message,
      });
      return { success: true, sid: result.sid };
    } catch (err) {
      functions.logger.error("sendSms failed", err);
      throw new HttpsError("internal", "Odoslanie SMS zlyhalo.");
    }
  }
);

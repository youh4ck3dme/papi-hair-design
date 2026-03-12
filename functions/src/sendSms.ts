import * as functions from "firebase-functions/v2";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

interface SendSmsInput {
  to: string;
  message: string;
}

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM_NUMBER;

function assertEnv() {
  if (!twilioSid || !twilioToken || !twilioFrom) {
    throw new HttpsError("failed-precondition", "SMS brána nie je nastavená.");
  }
}

function assertRole(request: CallableRequest<SendSmsInput>) {
  const role = request.auth?.token?.role as string | undefined;
  if (!role || !["owner", "admin"].includes(role)) {
    throw new HttpsError("permission-denied", "Nemáte oprávnenie posielať SMS.");
  }
}

export const sendSms = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<SendSmsInput>) => {
    assertRole(request);
    assertEnv();

    const to = request.data?.to?.trim();
    const message = request.data?.message?.trim();
    if (!to || !message) {
      throw new HttpsError("invalid-argument", "Chýba príjemca alebo text správy.");
    }

    const { Twilio } = await import("twilio");
    const client = new Twilio(twilioSid!, twilioToken!);
    try {
      const result = await client.messages.create({
        to,
        from: twilioFrom!,
        body: message,
      });
      return { success: true, sid: result.sid };
    } catch (err) {
      functions.logger.error("sendSms failed", err);
      throw new HttpsError("internal", "Odoslanie SMS zlyhalo.");
    }
  }
);

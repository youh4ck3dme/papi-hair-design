import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { getClientIp } from "./clientIp";
import { checkRateLimit } from "./middleware/rateLimit";
import {
  buildClientDiagnosticWritePayload,
  type RecordClientDiagnosticData,
} from "./clientDiagnostics";
import { hashOpaqueToken } from "./publicBookingAccess";

export const recordClientDiagnostic = functions.https.onCall(
  { region: "europe-west1" },
  async (request: functions.https.CallableRequest<RecordClientDiagnosticData>) => {
    const db = getFirestore();
    const clientIp = getClientIp(request.rawRequest);
    const rateLimitKey = request.auth?.uid
      ? `client_diagnostic_uid_${request.auth.uid}`
      : clientIp
        ? `client_diagnostic_ip_${hashOpaqueToken(String(clientIp))}`
        : "client_diagnostic_anon";

    await checkRateLimit(rateLimitKey);

    const payload = buildClientDiagnosticWritePayload(request);
    const ipHash = clientIp ? hashOpaqueToken(String(clientIp)) : null;

    const docRef = await db.collection("app_diagnostics").add({
      ...payload,
      ip_hash: ipHash,
    });

    return {
      ok: true,
      id: docRef.id,
      fingerprint: payload.fingerprint,
    };
  },
);

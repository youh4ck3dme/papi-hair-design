import * as functions from "firebase-functions/v2";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getClientIp } from "./clientIp";
import { checkRateLimit } from "./middleware/rateLimit";
import { hashOpaqueToken } from "./publicBookingAccess";

interface ResolveBookingAccountStateInput {
  claim_token: string;
}

type BookingAccountState = "existing_account" | "known_customer" | "new_customer";

function getClaimToken(data: ResolveBookingAccountStateInput): string {
  return typeof data.claim_token === "string" ? data.claim_token.trim() : "";
}

function parseProviderState(userRecord: Awaited<ReturnType<ReturnType<typeof getAuth>["getUserByEmail"]>>) {
  const providerIds = new Set(userRecord.providerData.map((provider) => provider.providerId));

  return {
    hasPassword: Boolean(userRecord.passwordHash) || providerIds.has("password"),
    hasGoogle: providerIds.has("google.com"),
  };
}

async function loadActiveClaim(db: FirebaseFirestore.Firestore, claimToken: string) {
  const tokenHash = hashOpaqueToken(claimToken);
  const claimsSnap = await db.collection("booking_claims")
    .where("token_hash", "==", tokenHash)
    .where("used_at", "==", null)
    .limit(1)
    .get();

  if (claimsSnap.empty) {
    throw new HttpsError("not-found", "Neplatný alebo expirovaný token");
  }

  const claim = claimsSnap.docs[0].data();
  const expiresAt = new Date(claim.expires_at ?? "");
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    throw new HttpsError("failed-precondition", "Token expiroval");
  }

  return claim;
}

function extractClaimIdentity(claim: Record<string, unknown>) {
  const appointmentId = typeof claim.appointment_id === "string" ? claim.appointment_id : "";
  const email = typeof claim.email === "string" ? claim.email : "";
  if (!appointmentId || !email) {
    throw new HttpsError("failed-precondition", "Token neobsahuje údaje o rezervácii");
  }

  return { appointmentId, email };
}

async function loadAppointmentCustomerState(
  db: FirebaseFirestore.Firestore,
  appointmentId: string,
) {
  const appointmentSnap = await db.collection("appointments").doc(appointmentId).get();
  const appointment = appointmentSnap.exists ? appointmentSnap.data() as Record<string, unknown> : null;

  return {
    customerName: typeof appointment?.customer_name === "string" ? appointment.customer_name : null,
    customerRecordStatus:
      appointment?.customer_record_status === "existing"
        ? "existing"
        : appointment?.customer_record_status === "created"
          ? "created"
          : null,
  };
}

async function resolveAuthProviderState(email: string) {
  try {
    const userRecord = await getAuth().getUserByEmail(email);
    return {
      state: "existing_account" as const,
      ...parseProviderState(userRecord),
    };
  } catch (error) {
    const authCode = typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

    if (authCode !== "auth/user-not-found") {
      throw error;
    }

    return null;
  }
}

export const resolveBookingAccountState = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<ResolveBookingAccountStateInput>) => {
    const claimToken = getClaimToken(request.data);
    if (!claimToken) {
      throw new HttpsError("invalid-argument", "Chýba claim token");
    }

    const ip = getClientIp(request.rawRequest) || "unknown";
    await checkRateLimit(ip);

    const db = getFirestore();
    const claim = await loadActiveClaim(db, claimToken);
    const { appointmentId, email } = extractClaimIdentity(claim);
    const { customerName, customerRecordStatus } = await loadAppointmentCustomerState(db, appointmentId);

    let state: BookingAccountState = customerRecordStatus === "existing" ? "known_customer" : "new_customer";
    let hasPassword = false;
    let hasGoogle = false;

    const providerState = await resolveAuthProviderState(email);
    if (providerState) {
      state = "existing_account";
      hasPassword = providerState.hasPassword;
      hasGoogle = providerState.hasGoogle;
    }

    return {
      success: true,
      state,
      email,
      customer_name: customerName,
      has_password: hasPassword,
      has_google: hasGoogle,
      customer_record_status: customerRecordStatus,
    };
  },
);

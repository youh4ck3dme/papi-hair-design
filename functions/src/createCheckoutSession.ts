import * as functions from "firebase-functions/v2";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "./guards";
import { checkRateLimit } from "./middleware/rateLimit";

interface CreateCheckoutSessionData {
  price_id?: string;
}

interface CreateCheckoutSessionResult {
  url: string | null;
  disabled?: boolean;
  message?: string;
}

const BILLING_DISABLED_MESSAGE =
  "Predplatné je momentálne nedostupné. Kontaktujte podporu.";

function parseAllowedPriceIds(): string[] {
  return (process.env.STRIPE_ALLOWED_PRICE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

export const createCheckoutSession = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<CreateCheckoutSessionData>): Promise<CreateCheckoutSessionResult> => {
    const uid = requireAuth(request.auth);
    await checkRateLimit(`checkout:${uid}`);

    const priceId = request.data?.price_id?.trim();
    if (!priceId) {
      throw new HttpsError("invalid-argument", "Missing price_id");
    }

    if (!isBillingEnabled()) {
      return {
        url: null,
        disabled: true,
        message: BILLING_DISABLED_MESSAGE,
      };
    }

    const allowedPriceIds = parseAllowedPriceIds();
    if (!allowedPriceIds.includes(priceId)) {
      throw new HttpsError("invalid-argument", "Unsupported price_id");
    }

    const checkoutBaseUrl = process.env.STRIPE_CHECKOUT_URL_BASE?.trim();
    if (!checkoutBaseUrl) {
      throw new HttpsError("failed-precondition", "Billing is not configured");
    }

    const checkoutUrl = new URL(checkoutBaseUrl);
    checkoutUrl.searchParams.set("uid", uid);
    checkoutUrl.searchParams.set("price_id", priceId);

    return { url: checkoutUrl.toString() };
  }
);

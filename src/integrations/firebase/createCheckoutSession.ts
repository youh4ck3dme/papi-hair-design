import { httpsCallable } from "firebase/functions";
import { functions } from "./config";
import { toCallableErrorMessage } from "./callableError";

export interface CreateCheckoutSessionRequest {
  price_id: string;
}

export interface CreateCheckoutSessionResponse {
  url: string | null;
  disabled?: boolean;
  message?: string;
}

export async function createCheckoutSession(
  payload: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  try {
    const fn = httpsCallable<CreateCheckoutSessionRequest, CreateCheckoutSessionResponse>(
      functions,
      "createCheckoutSession"
    );
    const result = await fn(payload);
    return result.data;
  } catch (error: unknown) {
    throw new Error(
      toCallableErrorMessage(
        error,
        "Nastala chyba pri vytváraní checkout relácie."
      )
    );
  }
}

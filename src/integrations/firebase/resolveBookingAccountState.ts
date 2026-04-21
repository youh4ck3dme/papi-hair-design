import { httpsCallable } from "firebase/functions";

import { functions } from "./config";
import { toCallableErrorMessage } from "./callableError";

export type BookingAccountState = "existing_account" | "known_customer" | "new_customer";

export interface ResolveBookingAccountStateBody {
  claim_token: string;
}

export interface ResolveBookingAccountStateResponse {
  success?: boolean;
  state?: BookingAccountState;
  email?: string | null;
  customer_name?: string | null;
  has_password?: boolean;
  has_google?: boolean;
  customer_record_status?: "existing" | "created" | null;
  error?: string;
}

export async function resolveBookingAccountState(
  body: ResolveBookingAccountStateBody,
): Promise<ResolveBookingAccountStateResponse> {
  try {
    const fn = httpsCallable<
      ResolveBookingAccountStateBody,
      ResolveBookingAccountStateResponse
    >(functions, "resolveBookingAccountState");

    const result = await fn(body);
    return result.data;
  } catch (error) {
    return {
      error: toCallableErrorMessage(error, "Stav účtu sa nepodarilo načítať."),
    };
  }
}

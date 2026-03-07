/**
 * Vytvorenie verejnej rezervácie cez Firebase Cloud Function (Callable).
 */
import { functions } from "./config";
import { httpsCallable } from "firebase/functions";

export interface CreatePublicBookingBody {
    business_id: string;
    service_id: string;
    employee_id: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    notes?: string;
    recaptcha_token?: string | null;
}

export interface CreatePublicBookingResponse {
    success?: boolean;
    error?: string;
    appointment_id?: string;
    claim_token?: string;
    customer_email?: string;
    customer_name?: string;
}

export async function createPublicBooking(body: CreatePublicBookingBody): Promise<CreatePublicBookingResponse> {
    try {
        const createPublicBookingFn = httpsCallable<CreatePublicBookingBody, CreatePublicBookingResponse>(functions, "createPublicBooking");
        const result = await createPublicBookingFn(body);
        return result.data;
    } catch (err: any) {
        console.error("createPublicBooking unexpected error:", err);
        return { error: err.message || "Neočakávaná chyba pri vytváraní rezervácie" };
    }
}

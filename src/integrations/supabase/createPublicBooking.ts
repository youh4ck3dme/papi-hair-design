/**
 * Vytvorenie verejnej rezervácie cez Supabase Edge Function.
 */
import { supabase } from "./client";

export interface CreatePublicBookingBody {
    business_id: string;
    service_id: string;
    employee_id: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
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
        const { data, error } = await supabase.functions.invoke("create-public-booking", {
            body,
        });

        if (error) {
            console.error("createPublicBooking error:", error);
            return { error: error.message || "Chyba pri vytváraní rezervácie" };
        }

        return data as CreatePublicBookingResponse;
    } catch (err: any) {
        console.error("createPublicBooking unexpected error:", err);
        return { error: err.message || "Neočakávaná chyba" };
    }
}

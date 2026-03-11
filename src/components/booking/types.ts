import { z } from "zod";

export const contactSchema = z.object({
    meno: z.string().min(2, "Meno musí mať aspoň 2 znaky"),
    priezvisko: z.string().min(2, "Priezvisko musí mať aspoň 2 znaky"),
    email: z.string().email("Neplatný email"),
    phone: z.string().optional(),
});

export interface ServiceRow {
    id: string;
    name_sk: string;
    description_sk: string | null;
    price: number | null;
    duration_minutes: number;
    buffer_minutes: number;
    sort_order?: number | null;
    is_active: boolean;
    business_id: string;
    category: string | null;
    subcategory: string | null;
}

export interface EmployeeRow {
    id: string;
    display_name: string;
    email: string | null;
    phone: string | null;
    is_active: boolean;
    business_id: string;
    photo_url: string | null;
    profile_id: string | null;
    service_mode?: "all" | "restricted" | null;
}

export interface MembershipRow {
    profile_id: string;
    role: "owner" | "admin" | "employee" | "customer";
}

export interface BookingResult {
    claim_token?: string;
    customer_email?: string;
    customer_name?: string;
}

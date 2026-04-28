import { z } from "zod";

export interface ContactFormData {
    meno: string;
    priezvisko: string;
    email: string;
    phone: string;
    note: string;
    marketing: boolean;
    terms: boolean;
    gdpr: boolean;
    all: boolean;
}

export type ContactErrors = Record<string, string>;

export function normalizeSlovakPhone(value: unknown): string | undefined {
    if (value == null) return undefined;

    const raw = String(value).trim();
    if (!raw) return undefined;
    if (!/^[+\d\s().-]+$/.test(raw)) return undefined;

    let digits = raw.replace(/\D/g, "");
    if (raw.startsWith("00")) {
        digits = digits.slice(2);
    }

    let nationalNumber = digits;
    if (nationalNumber.startsWith("421")) {
        nationalNumber = nationalNumber.slice(3);
    } else if (nationalNumber.startsWith("0")) {
        nationalNumber = nationalNumber.slice(1);
    }

    if (!/^\d{9}$/.test(nationalNumber)) return undefined;

    return `+421${nationalNumber}`;
}

export const contactSchema = z.object({
    meno: z.string().trim().min(2, "Meno musí mať aspoň 2 znaky"),
    priezvisko: z.string().trim().min(2, "Priezvisko musí mať aspoň 2 znaky"),
    email: z.string().trim().email("Neplatný email"),
    phone: z.string().optional().transform((value, ctx) => {
        const normalized = normalizeSlovakPhone(value);
        if ((value ?? "").trim().length > 0 && !normalized) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Telefón musí byť platné slovenské číslo",
            });
            return z.NEVER;
        }

        return normalized;
    }),
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
    subcategory_id?: string | null;
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
  appointment_id?: string;
  claim_token?: string;
  customer_email?: string;
  customer_name?: string;
  history_access_token?: string | null;
  history_reference?: string | null;
  customer_record_status?: "existing" | "created" | null;
}

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import * as crypto from "crypto";

interface CreatePublicBookingData {
    business_id: string;
    service_id: string;
    employee_id: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
}

/** Normalize email: lowercase, strip + aliases */
function normalizeEmail(email: string): string {
    const [localRaw, domain] = email.toLowerCase().trim().split("@");
    if (!domain) return email.toLowerCase().trim();
    const local = localRaw.split("+")[0];
    return `${local}@${domain}`;
}

export const createPublicBooking = functions.https.onCall(async (request: CallableRequest<CreatePublicBookingData>) => {
    const { data } = request;
    const db = admin.firestore();

    // 0. Validation
    const { business_id, service_id, employee_id, start_at, customer_name, customer_email, customer_phone } = data;
    if (!business_id || !service_id || !employee_id || !start_at || !customer_name || !customer_email) {
        throw new HttpsError("invalid-argument", "Chýbajúce povinné polia");
    }

    const sanitizedEmail = normalizeEmail(customer_email);
    const startDate = new Date(start_at);
    if (isNaN(startDate.getTime())) {
        throw new HttpsError("invalid-argument", "Neplatný dátum");
    }

    // 1. Get service & employee
    const [serviceSnap, employeeSnap] = await Promise.all([
        db.collection("services").doc(service_id).get(),
        db.collection("employees").doc(employee_id).get()
    ]);

    const service = serviceSnap.data();
    const employee = employeeSnap.data();

    if (!service || !service.is_active || service.business_id !== business_id) {
        throw new HttpsError("not-found", "Služba nebola nájdená");
    }
    if (!employee || !employee.is_active || employee.business_id !== business_id) {
        throw new HttpsError("not-found", "Zamestnanec nebol nájdený");
    }

    // 2. Calculate end time & check conflicts
    const totalMinutes = (service.duration_minutes || 30) + (service.buffer_minutes || 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    const conflictsSnap = await db.collection("appointments")
        .where("employee_id", "==", employee_id)
        .where("status", "!=", "cancelled")
        .where("start_at", "<", endDate.toISOString())
        .where("end_at", ">", startDate.toISOString())
        .limit(1)
        .get();

    if (!conflictsSnap.empty) {
        throw new HttpsError("already-exists", "Tento termín je už obsadený");
    }

    // 3. Find or create customer
    const customersSnap = await db.collection("customers")
        .where("business_id", "==", business_id)
        .where("email", "==", sanitizedEmail)
        .limit(1)
        .get();

    let customerId: string;
    if (!customersSnap.empty) {
        customerId = customersSnap.docs[0].id;
        await db.collection("customers").doc(customerId).update({
            full_name: customer_name.trim(),
            phone: customer_phone || null
        });
    } else {
        const newCust = await db.collection("customers").add({
            business_id,
            full_name: customer_name.trim(),
            email: sanitizedEmail,
            phone: customer_phone || null,
            created_at: new Date().toISOString()
        });
        customerId = newCust.id;
    }

    // 4. Create appointment
    const appointment = await db.collection("appointments").add({
        business_id,
        customer_id: customerId,
        customer_name: customer_name.trim(),
        customer_email: sanitizedEmail,
        customer_phone: customer_phone || null,
        employee_id,
        employee_name: employee.display_name || "?",
        employee_color: employee.color || null,
        service_id,
        service_name: service.name_sk || "?",
        service_price: service.price || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        status: "confirmed",
        created_at: new Date().toISOString()
    });

    // 5. Generate claim token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.collection("booking_claims").add({
        business_id,
        appointment_id: appointment.id,
        email: sanitizedEmail,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
    });

    // 6. Trigger email/notifications (In a real app, use Pub/Sub or similar)
    // For the blueprint, we can call them here or use a helper.
    // We'll assume the email function will be implemented separately.

    return {
        success: true,
        appointment_id: appointment.id,
        claim_token: token,
        customer_email: sanitizedEmail,
        customer_name: customer_name.trim()
    };
});

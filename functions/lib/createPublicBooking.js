"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPublicBooking = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
function normalizeEmail(email) {
    const [localRaw, domain] = email.toLowerCase().trim().split("@");
    if (!domain)
        return email.toLowerCase().trim();
    const local = localRaw.split("+")[0];
    return `${local}@${domain}`;
}
exports.createPublicBooking = functions.https.onCall(async (request) => {
    const { data } = request;
    const db = admin.firestore();
    const { business_id, service_id, employee_id, start_at, customer_name, customer_email, customer_phone } = data;
    if (!business_id || !service_id || !employee_id || !start_at || !customer_name || !customer_email) {
        throw new https_1.HttpsError("invalid-argument", "Chýbajúce povinné polia");
    }
    const sanitizedEmail = normalizeEmail(customer_email);
    const startDate = new Date(start_at);
    if (isNaN(startDate.getTime())) {
        throw new https_1.HttpsError("invalid-argument", "Neplatný dátum");
    }
    const [serviceSnap, employeeSnap] = await Promise.all([
        db.collection("services").doc(service_id).get(),
        db.collection("employees").doc(employee_id).get()
    ]);
    const service = serviceSnap.data();
    const employee = employeeSnap.data();
    if (!service || !service.is_active || service.business_id !== business_id) {
        throw new https_1.HttpsError("not-found", "Služba nebola nájdená");
    }
    if (!employee || !employee.is_active || employee.business_id !== business_id) {
        throw new https_1.HttpsError("not-found", "Zamestnanec nebol nájdený");
    }
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
        throw new https_1.HttpsError("already-exists", "Tento termín je už obsadený");
    }
    const customersSnap = await db.collection("customers")
        .where("business_id", "==", business_id)
        .where("email", "==", sanitizedEmail)
        .limit(1)
        .get();
    let customerId;
    if (!customersSnap.empty) {
        customerId = customersSnap.docs[0].id;
        await db.collection("customers").doc(customerId).update({
            full_name: customer_name.trim(),
            phone: customer_phone || null
        });
    }
    else {
        const newCust = await db.collection("customers").add({
            business_id,
            full_name: customer_name.trim(),
            email: sanitizedEmail,
            phone: customer_phone || null,
            created_at: new Date().toISOString()
        });
        customerId = newCust.id;
    }
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
    return {
        success: true,
        appointment_id: appointment.id,
        claim_token: token,
        customer_email: sanitizedEmail,
        customer_name: customer_name.trim()
    };
});
//# sourceMappingURL=createPublicBooking.js.map
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
exports.syncOfflineData = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const guards_1 = require("./guards");
const MAX_SYNC_CHANGES = 100;
const MAX_ID_LENGTH = 128;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const APPOINTMENT_MUTABLE_FIELDS = new Set([
    "start_at",
    "end_at",
    "customer_name",
    "customer_phone",
    "customer_email",
    "customer_id",
    "employee_id",
    "employee_name",
    "employee_color",
    "service_id",
    "service_name",
    "service_price",
    "status",
    "note",
    "updated_at"
]);
function assertSafeId(value) {
    if (!value || value.length > MAX_ID_LENGTH || !SAFE_ID.test(value)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid document id");
    }
}
function normalizeLegacyActions(actions, businessId) {
    if (!actions?.length)
        return [];
    const nowIso = new Date().toISOString();
    const changes = [];
    for (const action of actions) {
        const actionId = action.payload?.id;
        if (typeof actionId !== "string" || !actionId)
            continue;
        if (action.type === "APPOINTMENT_CANCEL") {
            changes.push({
                table: "appointments",
                id: actionId,
                data: { status: "cancelled", updated_at: nowIso, business_id: businessId },
                deleted: false
            });
            continue;
        }
        const payloadData = { ...action.payload, business_id: businessId };
        changes.push({
            table: "appointments",
            id: actionId,
            data: payloadData,
            deleted: false
        });
    }
    return changes;
}
function normalizeChanges(data, businessId) {
    const directChanges = Array.isArray(data.changes) ? data.changes : [];
    const legacyChanges = normalizeLegacyActions(data.actions, businessId);
    const merged = [...directChanges, ...legacyChanges];
    if (!merged.length)
        return [];
    if (merged.length > MAX_SYNC_CHANGES) {
        throw new https_1.HttpsError("invalid-argument", "Too many changes in a single sync");
    }
    return merged;
}
function buildAppointmentPatch(raw, businessId) {
    const nowIso = new Date().toISOString();
    const patch = {
        business_id: businessId,
        updated_at: nowIso
    };
    if (!raw) {
        return patch;
    }
    for (const [key, value] of Object.entries(raw)) {
        if (!APPOINTMENT_MUTABLE_FIELDS.has(key))
            continue;
        if (value === undefined)
            continue;
        patch[key] = value;
    }
    if (typeof raw.price_total === "number" && patch.service_price === undefined) {
        patch.service_price = raw.price_total;
    }
    return patch;
}
async function resolveBusinessId(db, uid, requestedBusinessId) {
    if (requestedBusinessId) {
        await (0, guards_1.requireMembership)(uid, requestedBusinessId, ["owner", "admin", "employee"]);
        return requestedBusinessId;
    }
    const fallbackMembership = await db.collection("memberships")
        .where("profile_id", "==", uid)
        .limit(1)
        .get();
    if (fallbackMembership.empty) {
        throw new https_1.HttpsError("permission-denied", "Access denied");
    }
    const businessId = fallbackMembership.docs[0].data().business_id;
    if (typeof businessId !== "string" || !businessId) {
        throw new https_1.HttpsError("failed-precondition", "Membership has no business_id");
    }
    return businessId;
}
exports.syncOfflineData = functions.https.onCall({ region: "europe-west1" }, async (request) => {
    const { auth, data } = request;
    const db = (0, firestore_1.getFirestore)();
    const uid = (0, guards_1.requireAuth)(auth);
    const businessId = await resolveBusinessId(db, uid, data.business_id);
    const incomingChanges = normalizeChanges(data, businessId);
    const lastSyncTimestamp = typeof data.last_sync_timestamp === "string" ? data.last_sync_timestamp : undefined;
    const nowIso = new Date().toISOString();
    let applied = 0;
    if (incomingChanges.length > 0) {
        const batch = db.batch();
        for (const change of incomingChanges) {
            if (change.table !== "appointments") {
                throw new https_1.HttpsError("invalid-argument", "Unsupported table in sync payload");
            }
            assertSafeId(change.id);
            const docRef = db.collection("appointments").doc(change.id);
            const existingDoc = await docRef.get();
            if (existingDoc.exists) {
                const existingBusinessId = existingDoc.data()?.business_id;
                if (existingBusinessId !== businessId) {
                    throw new https_1.HttpsError("permission-denied", "Cross-business sync mutation denied");
                }
            }
            if (change.deleted) {
                if (existingDoc.exists) {
                    batch.delete(docRef);
                    applied += 1;
                }
                continue;
            }
            const patch = buildAppointmentPatch(change.data, businessId);
            batch.set(docRef, patch, { merge: true });
            applied += 1;
        }
        if (applied > 0) {
            await batch.commit();
        }
    }
    let pullQuery = db.collection("appointments").where("business_id", "==", businessId);
    if (lastSyncTimestamp) {
        pullQuery = pullQuery.where("updated_at", ">", lastSyncTimestamp);
    }
    else if (typeof data.days === "number" && Number.isFinite(data.days) && data.days > 0) {
        const sinceDate = new Date(Date.now() - Math.floor(data.days) * 24 * 60 * 60 * 1000).toISOString();
        pullQuery = pullQuery.where("updated_at", ">", sinceDate);
    }
    const appointmentsSnap = await pullQuery.get();
    const pulledAppointments = appointmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return {
        success: true,
        applied,
        server_timestamp: nowIso,
        appointments: pulledAppointments,
        conflicts: [],
        pulled: {
            appointments: pulledAppointments
        }
    };
});
//# sourceMappingURL=syncOfflineData.js.map
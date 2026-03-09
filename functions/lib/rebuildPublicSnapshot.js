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
exports.onEmployeeServiceWrite = exports.onDateOverrideWrite = exports.onBusinessHoursWrite = exports.onEmployeeWrite = exports.onServiceWrite = exports.onBusinessWrite = exports.rebuildPublicSnapshot = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
async function buildAndWriteSnapshot(db, businessId) {
    const [bizDoc, servicesSnap, employeesSnap, hoursSnap, overridesSnap, esSnap] = await Promise.all([
        db.collection("businesses").doc(businessId).get(),
        db
            .collection("services")
            .where("business_id", "==", businessId)
            .where("is_active", "==", true)
            .get(),
        db
            .collection("employees")
            .where("business_id", "==", businessId)
            .where("is_active", "==", true)
            .get(),
        db
            .collection("business_hours")
            .where("business_id", "==", businessId)
            .get(),
        db
            .collection("business_date_overrides")
            .where("business_id", "==", businessId)
            .get(),
        db.collection("employee_services").get(),
    ]);
    if (!bizDoc.exists) {
        throw new https_1.HttpsError("not-found", "Business not found");
    }
    const employeeServiceMap = {};
    esSnap.forEach((d) => {
        const ed = d.data();
        if (ed.business_id === businessId && ed.employee_id && ed.service_id) {
            if (!employeeServiceMap[ed.employee_id])
                employeeServiceMap[ed.employee_id] = [];
            employeeServiceMap[ed.employee_id].push(ed.service_id);
        }
    });
    const snapshot = {
        business: { id: bizDoc.id, ...bizDoc.data() },
        services: servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        employees: employeesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        business_hours: hoursSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        date_overrides: overridesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        employee_service_map: employeeServiceMap,
        revision: Date.now(),
        updated_at: new Date().toISOString(),
        status: "ready",
    };
    await db.collection("public_snapshots").doc(businessId).set(snapshot);
    await db.collection("ops_health").doc(`snapshot_${businessId}`).set({
        kind: "public_snapshot",
        business_id: businessId,
        status: "ready",
        revision: snapshot.revision,
        updated_at: snapshot.updated_at,
        error: null,
    });
    return snapshot.revision;
}
function resolveBusinessId(before, after, paramId) {
    if (paramId)
        return paramId;
    const fromAfter = after?.data()?.business_id;
    if (fromAfter)
        return fromAfter;
    const fromBefore = before?.data()?.business_id;
    return fromBefore;
}
exports.rebuildPublicSnapshot = functions.https.onCall({ region: "europe-west1" }, async (request) => {
    const { auth, data } = request;
    const db = (0, firestore_1.getFirestore)();
    if (!auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const businessId = data.business_id?.trim();
    if (!businessId) {
        throw new https_1.HttpsError("invalid-argument", "business_id is required");
    }
    const membershipSnap = await db
        .collection("memberships")
        .where("business_id", "==", businessId)
        .where("profile_id", "==", auth.uid)
        .limit(1)
        .get();
    const role = membershipSnap.empty ? "" : (membershipSnap.docs[0].data().role || "");
    if (membershipSnap.empty || !(role === "owner" || role === "admin")) {
        throw new https_1.HttpsError("permission-denied", "Forbidden");
    }
    const revision = await buildAndWriteSnapshot(db, businessId);
    return { success: true, revision };
});
async function rebuildFromChange(before, after, businessIdParam) {
    const db = (0, firestore_1.getFirestore)();
    const businessId = resolveBusinessId(before, after, businessIdParam);
    if (!businessId)
        return;
    try {
        await buildAndWriteSnapshot(db, businessId);
    }
    catch (err) {
        await db.collection("ops_health").doc(`snapshot_${businessId}`).set({
            kind: "public_snapshot",
            business_id: businessId,
            status: "failed",
            updated_at: new Date().toISOString(),
            error: err?.message ?? "unknown error",
        });
        console.error("Snapshot rebuild failed", businessId, err);
    }
}
exports.onBusinessWrite = (0, firestore_2.onDocumentWritten)({ region: "europe-west1", document: "businesses/{businessId}" }, async (event) => rebuildFromChange(event.data?.before, event.data?.after, event.params.businessId));
exports.onServiceWrite = (0, firestore_2.onDocumentWritten)({ region: "europe-west1", document: "services/{serviceId}" }, async (event) => rebuildFromChange(event.data?.before, event.data?.after));
exports.onEmployeeWrite = (0, firestore_2.onDocumentWritten)({ region: "europe-west1", document: "employees/{employeeId}" }, async (event) => rebuildFromChange(event.data?.before, event.data?.after));
exports.onBusinessHoursWrite = (0, firestore_2.onDocumentWritten)({ region: "europe-west1", document: "business_hours/{docId}" }, async (event) => rebuildFromChange(event.data?.before, event.data?.after));
exports.onDateOverrideWrite = (0, firestore_2.onDocumentWritten)({ region: "europe-west1", document: "business_date_overrides/{docId}" }, async (event) => rebuildFromChange(event.data?.before, event.data?.after));
exports.onEmployeeServiceWrite = (0, firestore_2.onDocumentWritten)({ region: "europe-west1", document: "employee_services/{docId}" }, async (event) => rebuildFromChange(event.data?.before, event.data?.after));
//# sourceMappingURL=rebuildPublicSnapshot.js.map
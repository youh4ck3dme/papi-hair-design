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
exports.rebuildPublicSnapshot = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
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
    return { success: true, revision: snapshot.revision };
});
//# sourceMappingURL=rebuildPublicSnapshot.js.map
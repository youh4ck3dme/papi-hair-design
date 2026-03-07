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
exports.listBookableProviders = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
exports.listBookableProviders = functions.https.onCall(async (request) => {
    const { data } = request;
    const db = admin.firestore();
    const { business_id, service_id } = data;
    if (!business_id) {
        throw new https_1.HttpsError("invalid-argument", "Missing business_id");
    }
    const businessSnap = await db.collection("businesses").doc(business_id).get();
    const allowAdmin = businessSnap.data()?.allow_admin_in_service_selection === true;
    const employeesSnap = await db.collection("employees")
        .where("business_id", "==", business_id)
        .where("is_active", "==", true)
        .get();
    const providers = [];
    for (const empDoc of employeesSnap.docs) {
        const empData = empDoc.data();
        const empId = empDoc.id;
        let role = "employee";
        if (empData.profile_id) {
            const membershipSnap = await db.collection("memberships")
                .where("business_id", "==", business_id)
                .where("profile_id", "==", empData.profile_id)
                .limit(1)
                .get();
            if (!membershipSnap.empty) {
                role = membershipSnap.docs[0].data().role;
            }
        }
        if (role === "admin" && !allowAdmin)
            continue;
        if (service_id) {
            const empServiceSnap = await db.collection("employee_services")
                .where("employee_id", "==", empId)
                .where("service_id", "==", service_id)
                .limit(1)
                .get();
            const hasAnyServiceSnap = await db.collection("employee_services")
                .where("employee_id", "==", empId)
                .limit(1)
                .get();
            if (!hasAnyServiceSnap.empty && empServiceSnap.empty) {
                continue;
            }
        }
        providers.push({
            id: empId,
            display_name: empData.display_name,
            email: empData.email,
            phone: empData.phone,
            photo_url: empData.photo_url,
            is_active: empData.is_active,
            role
        });
    }
    return providers;
});
//# sourceMappingURL=listBookableProviders.js.map
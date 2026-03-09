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
exports.bootstrapAdminAccess = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const guards_1 = require("./guards");
const rebuildPublicSnapshot_1 = require("./rebuildPublicSnapshot");
const DEFAULT_BUSINESS_ID = "papi-hair-design-main";
const BOOTSTRAP_OWNER_EMAILS = new Set([
    "papi@papihairdesign.sk",
    "miska@papihairdesign.sk",
    "mato@papihairdesign.sk",
]);
function buildDisplayName(email) {
    if (!email)
        return "Papi Hair Design";
    const name = email.split("@")[0]?.trim();
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Papi Hair Design";
}
exports.bootstrapAdminAccess = functions.https.onCall({ region: "europe-west1" }, async (request) => {
    const uid = (0, guards_1.requireAuth)(request.auth);
    const email = request.auth?.token.email;
    const businessId = request.data?.business_id?.trim() || DEFAULT_BUSINESS_ID;
    const db = (0, firestore_1.getFirestore)();
    const membershipRef = db.collection("memberships").doc(`${uid}_${businessId}`);
    const membershipSnap = await membershipRef.get();
    if (membershipSnap.exists) {
        const existingRole = membershipSnap.data()?.role ?? null;
        if (existingRole === "owner" || existingRole === "admin") {
            await (0, rebuildPublicSnapshot_1.buildAndWriteSnapshot)(db, businessId);
            return { success: true, role: existingRole, business_id: businessId, already_bootstrapped: true };
        }
        throw new https_1.HttpsError("permission-denied", "Existing membership is not eligible for admin bootstrap");
    }
    const existingOwnerSnap = await db
        .collection("memberships")
        .where("business_id", "==", businessId)
        .where("role", "==", "owner")
        .limit(1)
        .get();
    const emailAllowedForBootstrap = !!email && BOOTSTRAP_OWNER_EMAILS.has(email);
    if (!existingOwnerSnap.empty) {
        throw new https_1.HttpsError("permission-denied", "Business already has an owner");
    }
    if (!emailAllowedForBootstrap) {
        throw new https_1.HttpsError("permission-denied", "Email is not allowed for bootstrap");
    }
    const businessRef = db.collection("businesses").doc(businessId);
    const profileRef = db.collection("profiles").doc(uid);
    const employeesSnap = await db
        .collection("employees")
        .where("business_id", "==", businessId)
        .limit(1)
        .get();
    const batch = db.batch();
    batch.set(businessRef, {
        name: "Papi Hair Design",
        updated_at: new Date().toISOString(),
    }, { merge: true });
    batch.set(profileRef, {
        full_name: buildDisplayName(email),
        email: email ?? null,
        updated_at: new Date().toISOString(),
    }, { merge: true });
    batch.set(membershipRef, {
        business_id: businessId,
        profile_id: uid,
        role: "owner",
        created_at: new Date().toISOString(),
    }, { merge: true });
    if (employeesSnap.empty) {
        const employeeRef = db.collection("employees").doc();
        batch.set(employeeRef, {
            business_id: businessId,
            profile_id: uid,
            display_name: buildDisplayName(email),
            email: email ?? null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    }
    await batch.commit();
    const revision = await (0, rebuildPublicSnapshot_1.buildAndWriteSnapshot)(db, businessId);
    return {
        success: true,
        role: "owner",
        business_id: businessId,
        already_bootstrapped: false,
        revision,
    };
});
//# sourceMappingURL=bootstrapAdminAccess.js.map
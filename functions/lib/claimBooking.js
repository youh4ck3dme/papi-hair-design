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
exports.claimBooking = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
exports.claimBooking = functions.https.onCall(async (request) => {
    const { auth, data } = request;
    const db = admin.firestore();
    if (!auth) {
        throw new https_1.HttpsError("unauthenticated", "Neautorizovaný prístup");
    }
    const { claim_token } = data;
    if (!claim_token) {
        throw new https_1.HttpsError("invalid-argument", "Chýba claim token");
    }
    const userId = auth.uid;
    const tokenHash = crypto.createHash("sha256").update(claim_token).digest("hex");
    const claimsSnap = await db.collection("booking_claims")
        .where("token_hash", "==", tokenHash)
        .where("used_at", "==", null)
        .limit(1)
        .get();
    if (claimsSnap.empty) {
        throw new https_1.HttpsError("not-found", "Neplatný alebo expirovaný token");
    }
    const claimDoc = claimsSnap.docs[0];
    const claim = claimDoc.data();
    if (new Date(claim.expires_at) < new Date()) {
        throw new https_1.HttpsError("failed-precondition", "Token expiroval");
    }
    const customersSnap = await db.collection("customers")
        .where("business_id", "==", claim.business_id)
        .where("email", "==", claim.email)
        .get();
    const batch = db.batch();
    customersSnap.forEach(doc => {
        batch.update(doc.ref, { profile_id: userId });
    });
    batch.update(claimDoc.ref, { used_at: new Date().toISOString() });
    const membershipsSnap = await db.collection("memberships")
        .where("business_id", "==", claim.business_id)
        .where("profile_id", "==", userId)
        .get();
    const canonicalMembershipId = `${userId}_${claim.business_id}`;
    const hasCanonicalMembership = membershipsSnap.docs.some((docSnap) => docSnap.id === canonicalMembershipId);
    if (!hasCanonicalMembership) {
        const memRef = db.collection("memberships").doc(canonicalMembershipId);
        batch.set(memRef, {
            business_id: claim.business_id,
            profile_id: userId,
            role: "customer",
            created_at: new Date().toISOString()
        }, { merge: true });
    }
    await batch.commit();
    return { success: true, message: "Účet bol úspešne prepojený" };
});
//# sourceMappingURL=claimBooking.js.map
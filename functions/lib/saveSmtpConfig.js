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
exports.saveSmtpConfig = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
exports.saveSmtpConfig = functions.https.onCall(async (request) => {
    const { auth, data } = request;
    const db = admin.firestore();
    if (!auth) {
        throw new https_1.HttpsError("unauthenticated", "Neautorizovaný prístup");
    }
    const { business_id, host, port, user: smtpUser, from, pass } = data;
    if (!business_id) {
        throw new https_1.HttpsError("invalid-argument", "Missing business_id");
    }
    const membershipSnap = await db.collection("memberships")
        .where("business_id", "==", business_id)
        .where("profile_id", "==", auth.uid)
        .limit(1)
        .get();
    if (membershipSnap.empty) {
        throw new https_1.HttpsError("permission-denied", "Forbidden – access denied");
    }
    const membership = membershipSnap.docs[0].data();
    if (membership.role !== "owner" && membership.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Forbidden – admin only");
    }
    const sanitized = {
        host: typeof host === "string" ? host.trim().slice(0, 255) : "",
        port: Number(port) || 465,
        user: typeof smtpUser === "string" ? smtpUser.trim().slice(0, 255) : "",
        from: typeof from === "string" ? from.trim().slice(0, 255) : "",
    };
    if (typeof pass === "string" && pass.length > 0) {
        sanitized.pass = pass.slice(0, 500);
    }
    else {
        const bizSnap = await db.collection("businesses").doc(business_id).get();
        const bizData = bizSnap.data();
        const existing = bizData?.smtp_config ?? {};
        sanitized.pass = existing.pass ?? "";
    }
    await db.collection("businesses").doc(business_id).update({
        smtp_config: sanitized,
        updated_at: new Date().toISOString()
    });
    return { success: true };
});
//# sourceMappingURL=saveSmtpConfig.js.map
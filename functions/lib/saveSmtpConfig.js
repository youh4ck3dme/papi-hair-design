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
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const guards_1 = require("./guards");
const secretManager_1 = require("./secretManager");
exports.saveSmtpConfig = functions.https.onCall({ region: "europe-west1" }, async (request) => {
    const { auth, data } = request;
    const db = (0, firestore_1.getFirestore)();
    const uid = (0, guards_1.requireAuth)(auth);
    const { business_id, host, port, user: smtpUser, from, pass } = data;
    if (!business_id) {
        throw new https_1.HttpsError("invalid-argument", "Missing business_id");
    }
    await (0, guards_1.requireMembership)(uid, business_id, ["owner", "admin"]);
    const sanitized = {
        host: typeof host === "string" ? host.trim().slice(0, 255) : "",
        port: Number(port) || 465,
        user: typeof smtpUser === "string" ? smtpUser.trim().slice(0, 255) : "",
        from: typeof from === "string" ? from.trim().slice(0, 255) : "",
    };
    let hasPassword = false;
    if (typeof pass === "string" && pass.length > 0) {
        const secretName = await (0, secretManager_1.upsertSecret)(`smtp-password-${business_id}`, pass);
        sanitized.password_secret = secretName;
        hasPassword = true;
    }
    else {
        const bizSnap = await db.collection("businesses").doc(business_id).get();
        const existing = bizSnap.data()?.smtp_config ?? {};
        if (existing?.password_secret) {
            sanitized.password_secret = existing.password_secret;
            hasPassword = true;
        }
    }
    await db.collection("businesses").doc(business_id).update({
        smtp_config: {
            ...sanitized,
            has_password: hasPassword
        },
        updated_at: new Date().toISOString()
    });
    return { success: true };
});
//# sourceMappingURL=saveSmtpConfig.js.map
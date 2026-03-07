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
exports.consentEvent = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
exports.consentEvent = functions.https.onCall(async (request) => {
    const { data, rawRequest } = request;
    const db = admin.firestore();
    const { action, subject_type, subject_id, categories, source, business_id, metadata } = data;
    if (!action || !subject_type || !categories || !source) {
        throw new https_1.HttpsError("invalid-argument", "Missing required fields");
    }
    const userAgent = rawRequest.headers["user-agent"]?.slice(0, 512) || null;
    const clientIp = rawRequest.headers["x-forwarded-for"] || rawRequest.socket.remoteAddress || null;
    const ipHash = clientIp ? crypto.createHash("sha256").update(String(clientIp)).digest("hex") : null;
    const event = {
        business_id: business_id || null,
        subject_type,
        subject_id: subject_id || null,
        action,
        categories,
        source,
        user_agent: userAgent,
        ip_hash: ipHash,
        metadata: metadata || {},
        created_at: new Date().toISOString()
    };
    const docRef = await db.collection("consent_events").add(event);
    return { ok: true, id: docRef.id };
});
//# sourceMappingURL=consentEvent.js.map
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
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
exports.syncOfflineData = functions.https.onCall(async (request) => {
    const { auth, data } = request;
    const db = admin.firestore();
    if (!auth) {
        throw new https_1.HttpsError("unauthenticated", "Neautorizovaný prístup");
    }
    const { business_id, last_sync_timestamp, changes } = data;
    if (!business_id) {
        throw new https_1.HttpsError("invalid-argument", "Missing business_id");
    }
    const membershipSnap = await db.collection("memberships")
        .where("business_id", "==", business_id)
        .where("profile_id", "==", auth.uid)
        .limit(1)
        .get();
    if (membershipSnap.empty) {
        throw new https_1.HttpsError("permission-denied", "Access denied");
    }
    if (changes && Array.isArray(changes) && changes.length > 0) {
        const batch = db.batch();
        for (const change of changes) {
            const { table, id, data: rowData, deleted } = change;
            if (!table || !id)
                continue;
            const docRef = db.collection(table).doc(id);
            if (deleted) {
                batch.delete(docRef);
            }
            else {
                batch.set(docRef, { ...rowData, updated_at: new Date().toISOString() }, { merge: true });
            }
        }
        await batch.commit();
    }
    let pullQuery = db.collection("appointments").where("business_id", "==", business_id);
    if (last_sync_timestamp) {
        pullQuery = pullQuery.where("updated_at", ">", last_sync_timestamp);
    }
    const appointmentsSnap = await pullQuery.get();
    const pulledAppointments = appointmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return {
        success: true,
        server_timestamp: new Date().toISOString(),
        pulled: {
            appointments: pulledAppointments
        }
    };
});
//# sourceMappingURL=syncOfflineData.js.map
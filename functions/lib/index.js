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
exports.syncOfflineData = exports.listBookableProviders = exports.consentEvent = exports.saveSmtpConfig = exports.createPublicBooking = exports.claimBooking = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
var claimBooking_1 = require("./claimBooking");
Object.defineProperty(exports, "claimBooking", { enumerable: true, get: function () { return claimBooking_1.claimBooking; } });
var createPublicBooking_1 = require("./createPublicBooking");
Object.defineProperty(exports, "createPublicBooking", { enumerable: true, get: function () { return createPublicBooking_1.createPublicBooking; } });
var saveSmtpConfig_1 = require("./saveSmtpConfig");
Object.defineProperty(exports, "saveSmtpConfig", { enumerable: true, get: function () { return saveSmtpConfig_1.saveSmtpConfig; } });
var consentEvent_1 = require("./consentEvent");
Object.defineProperty(exports, "consentEvent", { enumerable: true, get: function () { return consentEvent_1.consentEvent; } });
var listBookableProviders_1 = require("./listBookableProviders");
Object.defineProperty(exports, "listBookableProviders", { enumerable: true, get: function () { return listBookableProviders_1.listBookableProviders; } });
var syncOfflineData_1 = require("./syncOfflineData");
Object.defineProperty(exports, "syncOfflineData", { enumerable: true, get: function () { return syncOfflineData_1.syncOfflineData; } });
//# sourceMappingURL=index.js.map
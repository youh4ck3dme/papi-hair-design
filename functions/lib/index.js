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
exports.onEmployeeServiceWrite = exports.onDateOverrideWrite = exports.onBusinessHoursWrite = exports.onEmployeeWrite = exports.onServiceWrite = exports.onBusinessWrite = exports.rebuildPublicSnapshot = exports.cleanupExpiredHolds = exports.confirmBooking = exports.createBookingHold = exports.importMigrationData = exports.syncOfflineData = exports.listBookableProviders = exports.consentEvent = exports.saveSmtpConfig = exports.createPublicBooking = exports.claimBooking = void 0;
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
var importMigrationData_1 = require("./importMigrationData");
Object.defineProperty(exports, "importMigrationData", { enumerable: true, get: function () { return importMigrationData_1.importMigrationData; } });
var createBookingHold_1 = require("./createBookingHold");
Object.defineProperty(exports, "createBookingHold", { enumerable: true, get: function () { return createBookingHold_1.createBookingHold; } });
var confirmBooking_1 = require("./confirmBooking");
Object.defineProperty(exports, "confirmBooking", { enumerable: true, get: function () { return confirmBooking_1.confirmBooking; } });
var cleanupExpiredHolds_1 = require("./cleanupExpiredHolds");
Object.defineProperty(exports, "cleanupExpiredHolds", { enumerable: true, get: function () { return cleanupExpiredHolds_1.cleanupExpiredHolds; } });
var rebuildPublicSnapshot_1 = require("./rebuildPublicSnapshot");
Object.defineProperty(exports, "rebuildPublicSnapshot", { enumerable: true, get: function () { return rebuildPublicSnapshot_1.rebuildPublicSnapshot; } });
var rebuildPublicSnapshot_2 = require("./rebuildPublicSnapshot");
Object.defineProperty(exports, "onBusinessWrite", { enumerable: true, get: function () { return rebuildPublicSnapshot_2.onBusinessWrite; } });
Object.defineProperty(exports, "onServiceWrite", { enumerable: true, get: function () { return rebuildPublicSnapshot_2.onServiceWrite; } });
Object.defineProperty(exports, "onEmployeeWrite", { enumerable: true, get: function () { return rebuildPublicSnapshot_2.onEmployeeWrite; } });
Object.defineProperty(exports, "onBusinessHoursWrite", { enumerable: true, get: function () { return rebuildPublicSnapshot_2.onBusinessHoursWrite; } });
Object.defineProperty(exports, "onDateOverrideWrite", { enumerable: true, get: function () { return rebuildPublicSnapshot_2.onDateOverrideWrite; } });
Object.defineProperty(exports, "onEmployeeServiceWrite", { enumerable: true, get: function () { return rebuildPublicSnapshot_2.onEmployeeServiceWrite; } });
//# sourceMappingURL=index.js.map
import * as admin from "firebase-admin";
import { claimBooking } from "./claimBooking";
import { consentEvent } from "./consentEvent";
import { createPublicBooking } from "./createPublicBooking";
import { listBookableProviders } from "./listBookableProviders";
import { saveSmtpConfig } from "./saveSmtpConfig";
import { syncOfflineData } from "./syncOfflineData";

if (!admin.apps.length) {
    admin.initializeApp();
}

export {
    claimBooking,
    consentEvent,
    createPublicBooking,
    listBookableProviders,
    saveSmtpConfig,
    syncOfflineData
};

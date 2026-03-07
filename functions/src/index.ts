import * as admin from "firebase-admin";

admin.initializeApp();

// @ts-ignore
export { claimBooking } from "./claimBooking";
// @ts-ignore
export { createPublicBooking } from "./createPublicBooking";
// @ts-ignore
export { saveSmtpConfig } from "./saveSmtpConfig";
// @ts-ignore
export { consentEvent } from "./consentEvent";
// @ts-ignore
export { listBookableProviders } from "./listBookableProviders";
// @ts-ignore
export { syncOfflineData } from "./syncOfflineData";

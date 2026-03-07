import * as admin from "firebase-admin";

admin.initializeApp();

// @ts-expect-error: Module export type mismatch in Cloud Functions v2
export { claimBooking } from "./claimBooking";
// @ts-expect-error: Module export type mismatch in Cloud Functions v2
export { createPublicBooking } from "./createPublicBooking";
// @ts-expect-error: Module export type mismatch in Cloud Functions v2
export { saveSmtpConfig } from "./saveSmtpConfig";
// @ts-expect-error: Module export type mismatch in Cloud Functions v2
export { consentEvent } from "./consentEvent";
// @ts-expect-error: Module export type mismatch in Cloud Functions v2
export { listBookableProviders } from "./listBookableProviders";
// @ts-expect-error: Module export type mismatch in Cloud Functions v2
export { syncOfflineData } from "./syncOfflineData";

import * as admin from "firebase-admin";
import * as Sentry from "@sentry/node";

admin.initializeApp();

const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  });
}

export { claimBooking } from "./claimBooking";
export { createPublicBooking } from "./createPublicBooking";
export { saveSmtpConfig } from "./saveSmtpConfig";
export { consentEvent } from "./consentEvent";
export { listBookableProviders } from "./listBookableProviders";
export { syncOfflineData } from "./syncOfflineData";
export { importMigrationData } from "./importMigrationData";
export { normalizeMemberships } from "./normalizeMemberships";
export { createBookingHold } from "./createBookingHold";
export { confirmBooking } from "./confirmBooking";
export { cleanupExpiredHolds } from "./cleanupExpiredHolds";
export { rebuildPublicSnapshot } from "./rebuildPublicSnapshot";
export { bootstrapAdminAccess } from "./bootstrapAdminAccess";
export { onProfileWriteSyncEmployeePhoto } from "./syncEmployeePhotoFromProfile";
export {
  onBusinessWrite,
  onServiceWrite,
  onEmployeeWrite,
  onBusinessHoursWrite,
  onDateOverrideWrite,
  onEmployeeServiceWrite,
} from "./rebuildPublicSnapshot";

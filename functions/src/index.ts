import * as admin from "firebase-admin";

admin.initializeApp();

const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  void import("@sentry/node")
    .then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: 0.1,
      });
    })
    .catch((error) => {
      console.warn("Sentry init failed", error);
    });
}

export { claimBooking } from "./claimBooking";
export { resolveBookingAccountState } from "./resolveBookingAccountState";
export { createPublicBooking } from "./createPublicBooking";
export { saveSmtpConfig } from "./saveSmtpConfig";
export { consentEvent } from "./consentEvent";
export { listBookableProviders } from "./listBookableProviders";
export { syncOfflineData } from "./syncOfflineData";
export { importMigrationData } from "./importMigrationData";
export { normalizeMemberships } from "./normalizeMemberships";
export { createBookingHold } from "./createBookingHold";
export { confirmBooking } from "./confirmBooking";
export { getPublicAvailabilityConflicts } from "./getPublicAvailabilityConflicts";
export { adminUpdateBookingStatus } from "./adminUpdateBookingStatus";
export { adminCalendarQuickAction } from "./adminCalendarQuickAction";
export { lookupBookingHistory } from "./lookupBookingHistory";
export { cancelCustomerBooking } from "./cancelCustomerBooking";
export { queueRegistrationWelcomeEmail } from "./queueRegistrationWelcomeEmail";
export { downloadBookingIcs } from "./calendarInvite";
export { cleanupExpiredHolds } from "./cleanupExpiredHolds";
export { cleanupComplianceData } from "./cleanupComplianceData";
export { rebuildPublicSnapshot } from "./rebuildPublicSnapshot";
export { bootstrapAdminAccess } from "./bootstrapAdminAccess";
export { enforceSalonRoles } from "./enforceSalonRoles";
export { createCheckoutSession } from "./createCheckoutSession";
export { onProfileWriteSyncEmployeePhoto } from "./syncEmployeePhotoFromProfile";
export {
  onBusinessWrite,
  onServiceWrite,
  onServiceSubcategoryWrite,
  onEmployeeWrite,
  onBusinessHoursWrite,
  onDateOverrideWrite,
  onEmployeeServiceWrite,
} from "./rebuildPublicSnapshot";

import { Timestamp } from "firebase-admin/firestore";

export const CONSENT_RETENTION_DAYS = 395; // ~13 months
export const AUDIT_RETENTION_DAYS = 365;
export const APP_DIAGNOSTICS_RETENTION_DAYS = 30;
export const ACCESS_TOKEN_GRACE_DAYS = 30;
export const RATE_LIMIT_RETENTION_HOURS = 24;

export interface ComplianceRetentionPolicy {
  key: string;
  label: string;
  collectionName: string;
  kind: "collection" | "collectionGroup";
  field: string;
  fieldType: "isoString" | "timestamp" | "epochMillis";
  retentionDays?: number;
  graceDays?: number;
  retentionHours?: number;
}

export const COMPLIANCE_RETENTION_POLICIES: ComplianceRetentionPolicy[] = [
  {
    key: "consent-events",
    label: "Consent events",
    collectionName: "consent_events",
    kind: "collection",
    field: "created_at",
    fieldType: "isoString",
    retentionDays: CONSENT_RETENTION_DAYS,
  },
  {
    key: "appointment-status-audit",
    label: "Appointment status audit",
    collectionName: "appointment_status_audit",
    kind: "collection",
    field: "created_at",
    fieldType: "isoString",
    retentionDays: AUDIT_RETENTION_DAYS,
  },
  {
    key: "app-diagnostics",
    label: "App diagnostics",
    collectionName: "app_diagnostics",
    kind: "collection",
    field: "created_at",
    fieldType: "isoString",
    retentionDays: APP_DIAGNOSTICS_RETENTION_DAYS,
  },
  {
    key: "appointment-status-audit-subcollections",
    label: "Appointment status audit subcollections",
    collectionName: "status_audit",
    kind: "collectionGroup",
    field: "created_at",
    fieldType: "isoString",
    retentionDays: AUDIT_RETENTION_DAYS,
  },
  {
    key: "calendar-action-audit",
    label: "Calendar action audit",
    collectionName: "calendar_action_audit",
    kind: "collection",
    field: "created_at",
    fieldType: "timestamp",
    retentionDays: AUDIT_RETENTION_DAYS,
  },
  {
    key: "booking-claims",
    label: "Booking claim links",
    collectionName: "booking_claims",
    kind: "collection",
    field: "expires_at",
    fieldType: "isoString",
    graceDays: ACCESS_TOKEN_GRACE_DAYS,
  },
  {
    key: "booking-history-access",
    label: "Booking history access links",
    collectionName: "booking_history_access",
    kind: "collection",
    field: "expires_at",
    fieldType: "isoString",
    graceDays: ACCESS_TOKEN_GRACE_DAYS,
  },
  {
    key: "rate-limits",
    label: "Rate limit counters",
    collectionName: "_ratelimits",
    kind: "collection",
    field: "resetTime",
    fieldType: "epochMillis",
    retentionHours: RATE_LIMIT_RETENTION_HOURS,
  },
];

function assertDefined(value: number | undefined, message: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(message);
  }
  return value;
}

export function cutoffIsoFromDays(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function cutoffTimestampFromDays(days: number, now = new Date()): Timestamp {
  return Timestamp.fromDate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
}

export function cutoffMillisFromHours(hours: number, now = new Date()): number {
  return now.getTime() - hours * 60 * 60 * 1000;
}

export function buildRetentionCutoff(
  policy: ComplianceRetentionPolicy,
  now = new Date(),
): string | number | Timestamp {
  if (policy.fieldType === "timestamp") {
    return cutoffTimestampFromDays(
      assertDefined(policy.retentionDays, `Missing retentionDays for ${policy.key}`),
      now,
    );
  }

  if (policy.fieldType === "epochMillis") {
    return cutoffMillisFromHours(
      assertDefined(policy.retentionHours, `Missing retentionHours for ${policy.key}`),
      now,
    );
  }

  const days = policy.graceDays ?? policy.retentionDays;
  return cutoffIsoFromDays(assertDefined(days, `Missing retention days for ${policy.key}`), now);
}

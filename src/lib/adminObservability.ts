export type ObservabilityAlertSeverity = "error" | "warning" | "info";
export type ObservabilityHealthTone = "healthy" | "warning" | "error";
export type PersistedObservabilityAlertStatus = "active" | "resolved";

export interface SnapshotInfoLike {
  status?: string | null;
  updated_at?: string | null;
}

export interface SnapshotHealthLike {
  status?: string | null;
  error?: string | null;
  updated_at?: string | null;
  last_success_at?: string | null;
  duration_ms?: number | null;
  service_count?: number | null;
  subcategory_count?: number | null;
}

export interface BookingFunnelHealthLike {
  total_events?: number | null;
  last_event_at?: string | null;
  last_event_name?: string | null;
}

export interface ObservabilityAlert {
  severity: ObservabilityAlertSeverity;
  title: string;
  description: string;
}

const STALE_SNAPSHOT_HOURS = 72;
const SLOW_SNAPSHOT_MS = 5_000;
const STALE_FUNNEL_DAYS = 14;

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffHours(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60));
}

function diffDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildObservabilityAlerts(
  snapshotInfo: SnapshotInfoLike | null | undefined,
  snapshotHealth: SnapshotHealthLike | null | undefined,
  bookingFunnelHealth: BookingFunnelHealthLike | null | undefined,
  now: Date = new Date(),
): ObservabilityAlert[] {
  const alerts: ObservabilityAlert[] = [];

  if (!snapshotInfo) {
    alerts.push({
      severity: "error",
      title: "Chýba public snapshot",
      description: "Booking frontend nemá načítaný public snapshot dokument pre aktuálnu firmu.",
    });
  } else if (snapshotInfo.status && snapshotInfo.status !== "ready") {
    alerts.push({
      severity: "error",
      title: "Snapshot nie je ready",
      description: `Aktuálny snapshot je v stave "${snapshotInfo.status}".`,
    });
  }

  if (!snapshotHealth) {
    alerts.push({
      severity: "warning",
      title: "Chýba ops health pre snapshot",
      description: "Systém ešte nevytvoril health dokument pre public snapshot.",
    });
  } else {
    if (snapshotHealth.status === "failed" || Boolean(snapshotHealth.error)) {
      alerts.push({
        severity: "error",
        title: "Posledný snapshot rebuild zlyhal",
        description: snapshotHealth.error || "Skontrolujte históriu rebuild eventov a opravte root cause.",
      });
    }

    const latestSnapshotTime =
      parseTimestamp(snapshotHealth.last_success_at) ??
      parseTimestamp(snapshotHealth.updated_at) ??
      parseTimestamp(snapshotInfo?.updated_at);

    if (latestSnapshotTime) {
      const ageHours = diffHours(latestSnapshotTime, now);
      if (ageHours >= STALE_SNAPSHOT_HOURS) {
        alerts.push({
          severity: "warning",
          title: "Snapshot je starý",
          description: `Posledný úspešný snapshot je starý ${ageHours} h.`,
        });
      }
    }

    if (typeof snapshotHealth.duration_ms === "number" && snapshotHealth.duration_ms >= SLOW_SNAPSHOT_MS) {
      alerts.push({
        severity: "warning",
        title: "Snapshot rebuild je pomalý",
        description: `Posledný rebuild trval ${snapshotHealth.duration_ms} ms.`,
      });
    }

    if (snapshotHealth.service_count === 0) {
      alerts.push({
        severity: "error",
        title: "Snapshot nemá služby",
        description: "Public snapshot obsahuje 0 služieb, booking flow by bol nefunkčný.",
      });
    }

    if (snapshotHealth.subcategory_count === 0) {
      alerts.push({
        severity: "warning",
        title: "Snapshot nemá podkategórie",
        description: "Public snapshot neobsahuje service subcategories pre booking výber.",
      });
    }
  }

  if (!bookingFunnelHealth) {
    alerts.push({
      severity: "info",
      title: "Booking funnel ešte nemá dáta",
      description: "Po prvých interakciách zákazníkov sa zobrazia funnel eventy a počítadlá.",
    });
  } else {
    const totalEvents = typeof bookingFunnelHealth.total_events === "number" ? bookingFunnelHealth.total_events : 0;
    if (totalEvents === 0) {
      alerts.push({
        severity: "info",
        title: "Booking funnel je prázdny",
        description: "Zatiaľ nebol zaznamenaný žiadny funnel event.",
      });
    }

    const lastEventAt = parseTimestamp(bookingFunnelHealth.last_event_at);
    if (lastEventAt && totalEvents > 0) {
      const ageDays = diffDays(lastEventAt, now);
      if (ageDays >= STALE_FUNNEL_DAYS) {
        alerts.push({
          severity: "warning",
          title: "Booking funnel je neaktívny",
          description: `Posledný funnel event je starý ${ageDays} dní.`,
        });
      }
    }
  }

  const severityOrder: Record<ObservabilityAlertSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };

  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function getObservabilityHealthTone(alerts: ObservabilityAlert[]): ObservabilityHealthTone {
  if (alerts.some((alert) => alert.severity === "error")) return "error";
  if (alerts.some((alert) => alert.severity === "warning")) return "warning";
  return "healthy";
}

export function getObservabilityHealthLabel(tone: ObservabilityHealthTone): string {
  switch (tone) {
    case "error":
      return "Vyžaduje zásah";
    case "warning":
      return "Vyžaduje pozornosť";
    default:
      return "Zdravé";
  }
}

export function getObservabilityToneClasses(tone: ObservabilityHealthTone): string {
  switch (tone) {
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
}

export function getAlertBadgeClasses(severity: ObservabilityAlertSeverity): string {
  switch (severity) {
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
}

export function getPersistedObservabilityStatusLabel(status: PersistedObservabilityAlertStatus): string {
  return status === "active" ? "Aktívny" : "Vyriešený";
}

export function getPersistedObservabilityStatusClasses(status: PersistedObservabilityAlertStatus): string {
  return status === "active"
    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

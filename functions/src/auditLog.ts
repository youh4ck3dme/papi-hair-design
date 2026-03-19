import type { Firestore } from "firebase-admin/firestore";

interface AppointmentStatusAuditEntry {
  appointmentId: string;
  businessId: string;
  previousStatus: string;
  nextStatus: string;
  actorType: "admin" | "system";
  actorUid: string | null;
}

export async function appendAppointmentStatusAuditEntry(
  db: Firestore,
  entry: AppointmentStatusAuditEntry
): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload = {
    appointment_id: entry.appointmentId,
    business_id: entry.businessId,
    previous_status: entry.previousStatus,
    next_status: entry.nextStatus,
    actor_type: entry.actorType,
    actor_uid: entry.actorUid,
    created_at: timestamp,
  };

  await Promise.all([
    db.collection("appointment_status_audit").add(payload),
    db.collection("appointments").doc(entry.appointmentId).collection("status_audit").add(payload),
  ]);
}


import * as functions from "firebase-functions/v2";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { requireAuth, requireMembership, type MembershipRole } from "./guards";

type QuickActionType = "move" | "duplicate" | "block" | "delete_block";

interface AdminCalendarQuickActionData {
  business_id: string;
  action: QuickActionType;
  event_type?: "appointment" | "time_block";
  appointment_id?: string;
  time_block_id?: string;
  employee_id?: string;
  start_at?: string;
  end_at?: string;
  reason?: string;
}

function toIso(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Missing datetime value");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpsError("invalid-argument", "Invalid datetime value");
  }
  return date.toISOString();
}

function overlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

async function resolveActorEmployeeId(
  businessId: string,
  uid: string,
): Promise<string | null> {
  const db = getFirestore();
  const snap = await db
    .collection("employees")
    .where("business_id", "==", businessId)
    .where("profile_id", "==", uid)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function ensureNoCollision(params: {
  businessId: string;
  employeeId: string;
  startAt: string;
  endAt: string;
  excludeAppointmentId?: string;
  excludeTimeBlockId?: string;
}) {
  const db = getFirestore();
  const from = new Date(params.startAt);
  const dayStart = new Date(from);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 2);

  const [appointmentsSnap, blocksSnap] = await Promise.all([
    db
      .collection("appointments")
      .where("business_id", "==", params.businessId)
      .where("employee_id", "==", params.employeeId)
      .where("start_at", ">=", dayStart.toISOString())
      .where("start_at", "<", dayEnd.toISOString())
      .get(),
    db
      .collection("time_blocks")
      .where("business_id", "==", params.businessId)
      .where("employee_id", "==", params.employeeId)
      .where("start_at", ">=", dayStart.toISOString())
      .where("start_at", "<", dayEnd.toISOString())
      .get(),
  ]);

  const appointmentCollision = appointmentsSnap.docs.some((docSnap) => {
    if (docSnap.id === params.excludeAppointmentId) return false;
    const row = docSnap.data();
    const status = typeof row.status === "string" ? row.status : "pending";
    if (status === "cancelled") return false;
    return overlap(
      params.startAt,
      params.endAt,
      String(row.start_at ?? ""),
      String(row.end_at ?? ""),
    );
  });
  if (appointmentCollision) {
    throw new HttpsError("already-exists", "Timeslot collides with another appointment");
  }

  const blockCollision = blocksSnap.docs.some((docSnap) => {
    if (docSnap.id === params.excludeTimeBlockId) return false;
    const row = docSnap.data();
    return overlap(
      params.startAt,
      params.endAt,
      String(row.start_at ?? ""),
      String(row.end_at ?? ""),
    );
  });
  if (blockCollision) {
    throw new HttpsError("already-exists", "Timeslot collides with a time block");
  }
}

async function appendCalendarActionAudit(params: {
  businessId: string;
  actorUid: string;
  actorRole: MembershipRole;
  action: QuickActionType;
  eventType: "appointment" | "time_block";
  sourceEventId: string | null;
  targetEventId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const db = getFirestore();
  await db.collection("calendar_action_audit").add({
    business_id: params.businessId,
    actor_uid: params.actorUid,
    actor_role: params.actorRole,
    action: params.action,
    event_type: params.eventType,
    source_event_id: params.sourceEventId,
    target_event_id: params.targetEventId,
    before: params.before,
    after: params.after,
    created_at: Timestamp.now(),
  });
}

export const adminCalendarQuickAction = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<AdminCalendarQuickActionData>) => {
    const uid = requireAuth(request.auth);
    const { business_id, action } = request.data;

    if (!business_id || !action) {
      throw new HttpsError("invalid-argument", "Missing quick action payload");
    }

    const membership = await requireMembership(uid, business_id);
    const role = membership.role ?? "customer";
    const actorEmployeeId = await resolveActorEmployeeId(business_id, uid);
    const db = getFirestore();

    if (action === "delete_block") {
      const blockId = request.data.time_block_id;
      if (!blockId) {
        throw new HttpsError("invalid-argument", "Missing time block id");
      }

      const ref = db.collection("time_blocks").doc(blockId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "Time block not found");
      }
      const row = snap.data() as Record<string, unknown>;
      if (row.business_id !== business_id) {
        throw new HttpsError("permission-denied", "Time block does not belong to this business");
      }
      if (role === "employee" && row.employee_id !== actorEmployeeId) {
        throw new HttpsError("permission-denied", "Employees can manage only their own blocks");
      }

      await ref.delete();
      await appendCalendarActionAudit({
        businessId: business_id,
        actorUid: uid,
        actorRole: role,
        action,
        eventType: "time_block",
        sourceEventId: blockId,
        targetEventId: null,
        before: row,
        after: null,
      });
      return { success: true };
    }

    const eventType = request.data.event_type ?? "appointment";
    const startAt = toIso(request.data.start_at);
    const endAt = toIso(request.data.end_at);
    if (endAt <= startAt) {
      throw new HttpsError("invalid-argument", "End must be later than start");
    }

    if (action === "block") {
      const employeeId = request.data.employee_id;
      if (!employeeId) {
        throw new HttpsError("invalid-argument", "Missing employee id");
      }
      if (role === "employee" && actorEmployeeId !== employeeId) {
        throw new HttpsError("permission-denied", "Employees can block only their own time");
      }

      await ensureNoCollision({
        businessId: business_id,
        employeeId: employeeId,
        startAt,
        endAt,
      });

      const created = await db.collection("time_blocks").add({
        business_id,
        employee_id: employeeId,
        start_at: startAt,
        end_at: endAt,
        reason: request.data.reason?.trim() || "Blokovaný čas",
        created_by: uid,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });

      const payload = {
        id: created.id,
        business_id,
        employee_id: employeeId,
        start_at: startAt,
        end_at: endAt,
        reason: request.data.reason?.trim() || "Blokovaný čas",
      };

      await appendCalendarActionAudit({
        businessId: business_id,
        actorUid: uid,
        actorRole: role,
        action,
        eventType: "time_block",
        sourceEventId: null,
        targetEventId: created.id,
        before: null,
        after: payload,
      });

      return {
        success: true,
        event_type: "time_block" as const,
        event_id: created.id,
        start_at: startAt,
        end_at: endAt,
      };
    }

    if (eventType === "appointment") {
      const appointmentId = request.data.appointment_id;
      if (!appointmentId) {
        throw new HttpsError("invalid-argument", "Missing appointment id");
      }
      const ref = db.collection("appointments").doc(appointmentId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "Appointment not found");
      }
      const row = snap.data() as Record<string, unknown>;
      if (row.business_id !== business_id) {
        throw new HttpsError("permission-denied", "Appointment does not belong to this business");
      }
      if (role === "employee" && row.employee_id !== actorEmployeeId) {
        throw new HttpsError("permission-denied", "Employees can manage only their own appointments");
      }

      const targetEmployeeId =
        (request.data.employee_id as string | undefined) ||
        (row.employee_id as string | undefined);
      if (!targetEmployeeId) {
        throw new HttpsError("invalid-argument", "Appointment has no employee id");
      }

      if (role === "employee" && targetEmployeeId !== actorEmployeeId) {
        throw new HttpsError("permission-denied", "Employees cannot move appointment to another employee");
      }

      await ensureNoCollision({
        businessId: business_id,
        employeeId: targetEmployeeId,
        startAt,
        endAt,
        excludeAppointmentId: action === "move" ? appointmentId : undefined,
      });

      if (action === "move") {
        await ref.update({
          start_at: startAt,
          end_at: endAt,
          employee_id: targetEmployeeId,
          updated_at: Timestamp.now(),
        });
        await appendCalendarActionAudit({
          businessId: business_id,
          actorUid: uid,
          actorRole: role,
          action,
          eventType: "appointment",
          sourceEventId: appointmentId,
          targetEventId: appointmentId,
          before: row,
          after: {
            ...row,
            start_at: startAt,
            end_at: endAt,
            employee_id: targetEmployeeId,
          },
        });

        return {
          success: true,
          event_type: "appointment" as const,
          event_id: appointmentId,
          start_at: startAt,
          end_at: endAt,
        };
      }

      if (action !== "duplicate") {
        throw new HttpsError("invalid-argument", "Unsupported action");
      }

      const now = Timestamp.now();
      const created = await db.collection("appointments").add({
        ...row,
        start_at: startAt,
        end_at: endAt,
        employee_id: targetEmployeeId,
        status: "pending",
        created_at: now,
        updated_at: now,
      });

      await appendCalendarActionAudit({
        businessId: business_id,
        actorUid: uid,
        actorRole: role,
        action,
        eventType: "appointment",
        sourceEventId: appointmentId,
        targetEventId: created.id,
        before: row,
        after: {
          ...row,
          start_at: startAt,
          end_at: endAt,
          employee_id: targetEmployeeId,
          status: "pending",
        },
      });

      return {
        success: true,
        event_type: "appointment" as const,
        event_id: created.id,
        start_at: startAt,
        end_at: endAt,
      };
    }

    const timeBlockId = request.data.time_block_id;
    if (!timeBlockId) {
      throw new HttpsError("invalid-argument", "Missing time block id");
    }
    const ref = db.collection("time_blocks").doc(timeBlockId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Time block not found");
    }
    const row = snap.data() as Record<string, unknown>;
    if (row.business_id !== business_id) {
      throw new HttpsError("permission-denied", "Time block does not belong to this business");
    }
    if (role === "employee" && row.employee_id !== actorEmployeeId) {
      throw new HttpsError("permission-denied", "Employees can manage only their own blocks");
    }

    const targetEmployeeId =
      (request.data.employee_id as string | undefined) ||
      (row.employee_id as string | undefined);
    if (!targetEmployeeId) {
      throw new HttpsError("invalid-argument", "Time block has no employee id");
    }
    if (role === "employee" && targetEmployeeId !== actorEmployeeId) {
      throw new HttpsError("permission-denied", "Employees cannot move block to another employee");
    }

    await ensureNoCollision({
      businessId: business_id,
      employeeId: targetEmployeeId,
      startAt,
      endAt,
      excludeTimeBlockId: action === "move" ? timeBlockId : undefined,
    });

    if (action === "move") {
      await ref.update({
        start_at: startAt,
        end_at: endAt,
        employee_id: targetEmployeeId,
        updated_at: Timestamp.now(),
      });
      await appendCalendarActionAudit({
        businessId: business_id,
        actorUid: uid,
        actorRole: role,
        action,
        eventType: "time_block",
        sourceEventId: timeBlockId,
        targetEventId: timeBlockId,
        before: row,
        after: {
          ...row,
          start_at: startAt,
          end_at: endAt,
          employee_id: targetEmployeeId,
        },
      });
      return {
        success: true,
        event_type: "time_block" as const,
        event_id: timeBlockId,
        start_at: startAt,
        end_at: endAt,
      };
    }

    if (action !== "duplicate") {
      throw new HttpsError("invalid-argument", "Unsupported action");
    }

    const created = await db.collection("time_blocks").add({
      ...row,
      start_at: startAt,
      end_at: endAt,
      employee_id: targetEmployeeId,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      created_by: uid,
    });

    await appendCalendarActionAudit({
      businessId: business_id,
      actorUid: uid,
      actorRole: role,
      action,
      eventType: "time_block",
      sourceEventId: timeBlockId,
      targetEventId: created.id,
      before: row,
      after: {
        ...row,
        start_at: startAt,
        end_at: endAt,
        employee_id: targetEmployeeId,
      },
    });

    return {
      success: true,
      event_type: "time_block" as const,
      event_id: created.id,
      start_at: startAt,
      end_at: endAt,
    };
  },
);

import * as functions from "firebase-functions/v2";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { requireAuth, requireMembership, type MembershipRole } from "./guards";
import {
  DEFAULT_RECURRENCE_TIMEZONE,
  type TimeBlockRepeatFrequency,
  buildTimeBlockOccurrences,
} from "./timeBlockRecurrence";

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
  all_day?: boolean;
  repeat?: boolean;
  repeat_frequency?: TimeBlockRepeatFrequency;
  repeat_until_date?: string;
  repeat_interval?: number;
  timezone?: string;
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

function stripRecurringSeriesMetadata(row: Record<string, unknown>) {
  const {
    series_id: _seriesId,
    occurrence_index: _occurrenceIndex,
    repeat: _repeat,
    repeat_frequency: _repeatFrequency,
    repeat_until_date: _repeatUntilDate,
    repeat_interval: _repeatInterval,
    timezone: _timezone,
    all_day: _allDay,
    ...rest
  } = row;

  return rest;
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

      const timezone =
        typeof request.data.timezone === "string" && request.data.timezone.trim().length > 0
          ? request.data.timezone.trim()
          : DEFAULT_RECURRENCE_TIMEZONE;
      const repeat = request.data.repeat === true;
      const repeatFrequency = request.data.repeat_frequency;
      const repeatUntilDate = request.data.repeat_until_date;
      const repeatInterval = request.data.repeat_interval;
      const allDay = request.data.all_day === true;
      const reason = request.data.reason?.trim() || "Blokovaný čas";

      const occurrences = buildTimeBlockOccurrences({
        startAt,
        endAt,
        timezone,
        repeat,
        repeatFrequency,
        repeatUntilDate,
        repeatInterval,
      });

      for (const occurrence of occurrences) {
        await ensureNoCollision({
          businessId: business_id,
          employeeId,
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
        });
      }

      const now = Timestamp.now();
      const timeBlocksRef = db.collection("time_blocks");
      const batch = db.batch();
      const seriesId = occurrences.length > 1 ? randomUUID() : null;
      const createdRefs = occurrences.map(() => timeBlocksRef.doc());

      occurrences.forEach((occurrence, index) => {
        batch.set(createdRefs[index], {
          business_id,
          employee_id: employeeId,
          start_at: occurrence.startAt,
          end_at: occurrence.endAt,
          reason,
          all_day: allDay,
          timezone,
          repeat,
          repeat_frequency: repeat ? repeatFrequency ?? null : null,
          repeat_until_date: repeat ? repeatUntilDate ?? null : null,
          repeat_interval: repeat ? Math.max(1, Math.floor(Number(repeatInterval ?? 1))) : 1,
          series_id: seriesId,
          occurrence_index: occurrence.occurrenceIndex,
          created_by: uid,
          created_at: now,
          updated_at: now,
        });
      });

      await batch.commit();

      const payload = {
        event_ids: createdRefs.map((ref) => ref.id),
        occurrences_count: createdRefs.length,
        series_id: seriesId,
        business_id,
        employee_id: employeeId,
        start_at: occurrences[0]?.startAt ?? startAt,
        end_at: occurrences[0]?.endAt ?? endAt,
        reason,
        all_day: allDay,
        repeat,
        repeat_frequency: repeat ? repeatFrequency ?? null : null,
        repeat_until_date: repeat ? repeatUntilDate ?? null : null,
        repeat_interval: repeat ? Math.max(1, Math.floor(Number(repeatInterval ?? 1))) : 1,
        timezone,
      };

      await appendCalendarActionAudit({
        businessId: business_id,
        actorUid: uid,
        actorRole: role,
        action,
        eventType: "time_block",
        sourceEventId: null,
        targetEventId: createdRefs[0]?.id ?? null,
        before: null,
        after: payload,
      });

      return {
        success: true,
        event_type: "time_block" as const,
        event_id: createdRefs[0]?.id ?? null,
        event_ids: createdRefs.map((ref) => ref.id),
        series_id: seriesId,
        occurrences_count: createdRefs.length,
        start_at: occurrences[0]?.startAt ?? startAt,
        end_at: occurrences[0]?.endAt ?? endAt,
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
      ...stripRecurringSeriesMetadata(row),
      start_at: startAt,
      end_at: endAt,
      employee_id: targetEmployeeId,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      created_by: uid,
      series_id: null,
      occurrence_index: 0,
      repeat: false,
      repeat_frequency: null,
      repeat_until_date: null,
      repeat_interval: 1,
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

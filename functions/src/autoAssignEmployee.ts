import { getFirestore } from "firebase-admin/firestore";

type EmployeeRole = "owner" | "admin" | "employee" | "customer";

interface BookableEmployee {
  id: string;
  display_name: string | null;
  color: string | null;
  profile_id: string | null;
  service_mode?: "all" | "restricted" | null;
}

interface AppointmentCandidate {
  employee_id?: string;
  start_at?: string;
  end_at?: string;
  status?: string;
  hold_expires_at?: string | null;
}

export interface AutoAssignedEmployee {
  id: string;
  display_name: string | null;
  color: string | null;
}

function isAppointmentBlocking(appointment: AppointmentCandidate, now: number): boolean {
  if (appointment.status === "cancelled" || appointment.status === "expired") {
    return false;
  }

  if (
    appointment.status === "hold_created" &&
    appointment.hold_expires_at &&
    new Date(appointment.hold_expires_at).getTime() < now
  ) {
    return false;
  }

  return true;
}

export function pickBestEmployee(
  employees: AutoAssignedEmployee[],
  appointments: AppointmentCandidate[],
  startAtIso: string,
  endAtIso: string,
  now = Date.now()
): AutoAssignedEmployee | null {
  const startMs = new Date(startAtIso).getTime();
  const endMs = new Date(endAtIso).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

  const ranked = employees
    .map((employee) => {
      const employeeAppointments = appointments.filter(
        (appointment) => appointment.employee_id === employee.id && isAppointmentBlocking(appointment, now)
      );

      const hasConflict = employeeAppointments.some((appointment) => {
        const conflictStart = new Date(appointment.start_at ?? "").getTime();
        const conflictEnd = new Date(appointment.end_at ?? "").getTime();
        if (Number.isNaN(conflictStart) || Number.isNaN(conflictEnd)) return false;
        return conflictStart < endMs && conflictEnd > startMs;
      });

      return {
        employee,
        hasConflict,
        dailyLoad: employeeAppointments.length,
      };
    })
    .filter((entry) => !entry.hasConflict)
    .sort((left, right) => {
      if (left.dailyLoad !== right.dailyLoad) {
        return left.dailyLoad - right.dailyLoad;
      }

      return (left.employee.display_name ?? "").localeCompare(right.employee.display_name ?? "", "sk");
    });

  return ranked[0]?.employee ?? null;
}

export async function listEligibleEmployees(
  businessId: string,
  serviceId: string
): Promise<AutoAssignedEmployee[]> {
  const db = getFirestore();

  const [businessSnap, employeesSnap, membershipsSnap, employeeServicesSnap] = await Promise.all([
    db.collection("businesses").doc(businessId).get(),
    db.collection("employees")
      .where("business_id", "==", businessId)
      .where("is_active", "==", true)
      .get(),
    db.collection("memberships").where("business_id", "==", businessId).get(),
    db.collection("employee_services").where("service_id", "==", serviceId).get(),
  ]);

  const allowAdminAsProvider = businessSnap.data()?.allow_admin_as_provider === true;
  const membershipByProfileId = new Map<string, EmployeeRole>();
  membershipsSnap.forEach((docSnap) => {
    const membership = docSnap.data() as { profile_id?: string; role?: EmployeeRole };
    if (membership.profile_id && membership.role) {
      membershipByProfileId.set(membership.profile_id, membership.role);
    }
  });

  const serviceEmployeeIds = new Set<string>();
  employeeServicesSnap.forEach((docSnap) => {
    const data = docSnap.data() as { employee_id?: string };
    if (typeof data.employee_id === "string") {
      serviceEmployeeIds.add(data.employee_id);
    }
  });

  return employeesSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BookableEmployee) }))
    .filter((employee) => {
      if (!allowAdminAsProvider && employee.profile_id) {
        const role = membershipByProfileId.get(employee.profile_id);
        if (role === "owner" || role === "admin") {
          return false;
        }
      }

      const serviceMode = employee.service_mode === "restricted" ? "restricted" : "all";
      if (serviceMode === "restricted") {
        return serviceEmployeeIds.has(employee.id);
      }

      return true;
    })
    .map((employee) => ({
      id: employee.id,
      display_name: employee.display_name ?? null,
      color: employee.color ?? null,
    }));
}

export async function assignEmployeeForSlot(params: {
  businessId: string;
  serviceId: string;
  startAtIso: string;
  endAtIso: string;
  preferredEmployeeId?: string | null;
}): Promise<AutoAssignedEmployee | null> {
  const db = getFirestore();
  const eligibleEmployees = await listEligibleEmployees(params.businessId, params.serviceId);
  if (!eligibleEmployees.length) {
    return null;
  }

  const scopedEmployees = params.preferredEmployeeId
    ? eligibleEmployees.filter((employee) => employee.id === params.preferredEmployeeId)
    : eligibleEmployees;
  if (!scopedEmployees.length) {
    return null;
  }

  const day = new Date(params.startAtIso);
  if (Number.isNaN(day.getTime())) {
    return null;
  }

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const employeeIds = scopedEmployees.map((employee) => employee.id);
  const appointmentDocs = [];

  for (let index = 0; index < employeeIds.length; index += 10) {
    const batchIds = employeeIds.slice(index, index + 10);
    const batchSnap = await db
      .collection("appointments")
      .where("employee_id", "in", batchIds)
      .where("start_at", ">=", dayStart.toISOString())
      .where("start_at", "<", dayEnd.toISOString())
      .get();

    appointmentDocs.push(...batchSnap.docs.map((docSnap) => docSnap.data() as AppointmentCandidate));
  }

  return pickBestEmployee(scopedEmployees, appointmentDocs, params.startAtIso, params.endAtIso);
}

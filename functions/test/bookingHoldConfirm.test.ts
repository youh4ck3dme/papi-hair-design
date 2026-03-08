import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import testEnv from "firebase-functions-test";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { createBookingHold } from "../lib/createBookingHold";
import { confirmBooking } from "../lib/confirmBooking";

const fft = testEnv({ projectId: "demo-test" });

beforeAll(() => {
  try {
    admin.initializeApp({ projectId: "demo-test" });
  } catch (err) {
    // already initialized
  }
});

// Skipped until Firestore emulator is wired into test env
describe.skip("booking hold + confirm", () => {
  beforeEach(async () => {
    const db = getFirestore();
    const snap = await db.collection("appointments").get();
    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  });

  afterEach(async () => {
    fft.cleanup();
  });

  it("creates hold and confirms idempotently", async () => {
    const data: any = {
      business_id: "biz",
      service_id: "svc",
      employee_id: "emp",
      start_at: new Date().toISOString(),
      customer_name: "Test User",
      customer_email: "test@example.com",
    };

    const hold = await (createBookingHold as any)(data, {});
    expect(hold.success).toBe(true);
    expect(hold.appointment_id).toBeTruthy();

    const confirm = await (confirmBooking as any)({ appointment_id: hold.appointment_id }, {});
    expect(confirm.success).toBe(true);
    expect(confirm.status).toBe("confirmed");

    const confirmAgain = await (confirmBooking as any)({ appointment_id: hold.appointment_id }, {});
    expect(confirmAgain.success).toBe(true);
    expect(confirmAgain.status).toBe("confirmed");
  });
});

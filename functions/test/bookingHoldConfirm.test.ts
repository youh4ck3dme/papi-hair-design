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

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const run = EMULATOR ? describe : describe.skip;

run("booking hold + confirm (requires Firestore emulator)", () => {
  beforeEach(async () => {
    const db = getFirestore();

    // Clear collections
    const collections = ["appointments", "businesses", "services", "employees", "customers"];
    for (const col of collections) {
      const snap = await db.collection(col).get();
      const batch = db.batch();
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Seed data
    await db.collection("businesses").doc("biz").set({ name: "Test Business", status: "active" });
    await db.collection("services").doc("svc").set({
      business_id: "biz",
      name_sk: "Test Service",
      duration_minutes: 30,
      price: 10
    });
    await db.collection("employees").doc("emp").set({
      business_id: "biz",
      display_name: "Test Employee"
    });
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
      idempotency_key: "booking-test-key",
    };

    const wrappedHold = fft.wrap(createBookingHold);
    const hold = await wrappedHold({ data });
    expect(hold.success).toBe(true);
    expect(hold.appointment_id).toBeTruthy();
    expect(hold.confirm_token).toBeTruthy();

    const holdAgain = await wrappedHold({ data });
    expect(holdAgain.success).toBe(true);
    expect(holdAgain.reused).toBe(true);
    expect(holdAgain.appointment_id).toBe(hold.appointment_id);

    const wrappedConfirm = fft.wrap(confirmBooking);
    const confirm = await wrappedConfirm({
      data: {
        appointment_id: hold.appointment_id,
        confirm_token: hold.confirm_token,
        idempotency_key: "booking-test-key",
      },
    });
    expect(confirm.success).toBe(true);
    expect(confirm.status).toBe("confirmed");

    const confirmAgain = await wrappedConfirm({
      data: {
        appointment_id: hold.appointment_id,
        confirm_token: hold.confirm_token,
        idempotency_key: "booking-test-key",
      },
    });
    expect(confirmAgain.success).toBe(true);
    expect(confirmAgain.status).toBe("confirmed");
  });
});

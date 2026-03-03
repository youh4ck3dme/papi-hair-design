/**
 * Testy pre createPublicBooking – Supabase Edge Function wrapper.
 * Supabase klient je mocknutý, žiadne sieťové volania.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock supabase client ─────────────────────────────────────────────────────
// vi.mock is hoisted – variables must be created via vi.hoisted() to be accessible inside the factory.
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

import { createPublicBooking, type CreatePublicBookingBody } from "./createPublicBooking";

const VALID_BODY: CreatePublicBookingBody = {
  business_id: "a1b2c3d4-0000-0000-0000-000000000001",
  service_id: "s1",
  employee_id: "e1",
  start_at: "2026-03-10T09:00:00.000Z",
  customer_name: "Ján Novák",
  customer_email: "jan@example.sk",
  customer_phone: "0901000001",
};

describe("createPublicBooking", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns success response on valid booking", async () => {
    const expected = {
      success: true,
      appointment_id: "appt-uuid-1",
      claim_token: "token-abc",
      customer_email: "jan@example.sk",
      customer_name: "Ján Novák",
    };
    mockInvoke.mockResolvedValueOnce({ data: expected, error: null });

    const result = await createPublicBooking(VALID_BODY);

    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("create-public-booking", { body: VALID_BODY });
    expect(result).toEqual(expected);
  });

  it("returns error message when supabase returns error", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Zamestnanec nie je dostupný" },
    });

    const result = await createPublicBooking(VALID_BODY);

    expect(result.error).toBe("Zamestnanec nie je dostupný");
    expect(result.success).toBeUndefined();
  });

  it("returns fallback error when supabase error has no message", async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: {} });

    const result = await createPublicBooking(VALID_BODY);

    expect(result.error).toBe("Chyba pri vytváraní rezervácie");
  });

  it("returns error on network exception", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network failure"));

    const result = await createPublicBooking(VALID_BODY);

    expect(result.error).toBe("Network failure");
    expect(result.success).toBeUndefined();
  });

  it("returns fallback error when exception has no message", async () => {
    mockInvoke.mockRejectedValueOnce({});

    const result = await createPublicBooking(VALID_BODY);

    expect(result.error).toBe("Neočakávaná chyba");
  });

  it("passes optional recaptcha_token in body", async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    await createPublicBooking({ ...VALID_BODY, recaptcha_token: "recaptcha-xyz" });

    expect(mockInvoke).toHaveBeenCalledWith("create-public-booking", {
      body: expect.objectContaining({ recaptcha_token: "recaptcha-xyz" }),
    });
  });

  it("passes request without optional phone", async () => {
    const bodyNoPhone: CreatePublicBookingBody = { ...VALID_BODY };
    delete bodyNoPhone.customer_phone;
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    const result = await createPublicBooking(bodyNoPhone);

    expect(result.success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("create-public-booking", {
      body: expect.not.objectContaining({ customer_phone: expect.anything() }),
    });
  });

  it("correctly extracts appointment_id from response", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, appointment_id: "uuid-999", claim_token: "tok" },
      error: null,
    });

    const result = await createPublicBooking(VALID_BODY);

    expect(result.appointment_id).toBe("uuid-999");
    expect(result.claim_token).toBe("tok");
  });
});
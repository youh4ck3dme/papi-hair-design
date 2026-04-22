import { describe, expect, it } from "vitest";
import { pickBestEmployee } from "../src/autoAssignEmployee";
import { createOpaqueToken, hashOpaqueToken, normalizeEmail, normalizePhone } from "../src/publicBookingAccess";

describe("publicBookingAccess", () => {
  it("normalizes email aliases", () => {
    expect(normalizeEmail("User+promo@example.com")).toBe("user@example.com");
  });

  it("normalizes slovak phone formats", () => {
    expect(normalizePhone("+421 905 123 456")).toBe("421905123456");
    expect(normalizePhone("0905 123 456")).toBe("421905123456");
    expect(normalizePhone("905123456")).toBe("421905123456");
  });

  it("creates opaque tokens with matching sha256 hash", () => {
    const tokenPair = createOpaqueToken();

    expect(tokenPair.token).toHaveLength(64);
    expect(tokenPair.tokenHash).toBe(hashOpaqueToken(tokenPair.token));
    expect(tokenPair.tokenHash).not.toBe(tokenPair.token);
  });
});

describe("pickBestEmployee", () => {
  const startAt = "2026-03-12T09:00:00.000Z";
  const endAt = "2026-03-12T10:00:00.000Z";

  it("returns the only available employee when another has conflict", () => {
    const selected = pickBestEmployee(
      [
        { id: "emp-1", display_name: "A", color: null },
        { id: "emp-2", display_name: "B", color: null },
      ],
      [
        {
          employee_id: "emp-1",
          start_at: "2026-03-12T08:30:00.000Z",
          end_at: "2026-03-12T09:30:00.000Z",
          status: "confirmed",
        },
      ],
      startAt,
      endAt
    );

    expect(selected?.id).toBe("emp-2");
  });

  it("prefers the employee with lower daily load when multiple are free", () => {
    const selected = pickBestEmployee(
      [
        { id: "emp-1", display_name: "A", color: null },
        { id: "emp-2", display_name: "B", color: null },
      ],
      [
        {
          employee_id: "emp-1",
          start_at: "2026-03-12T12:00:00.000Z",
          end_at: "2026-03-12T13:00:00.000Z",
          status: "confirmed",
        },
      ],
      startAt,
      endAt
    );

    expect(selected?.id).toBe("emp-2");
  });
});

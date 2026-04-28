import { describe, expect, it } from "vitest";
import { contactSchema, normalizeSlovakPhone } from "./types";

describe("booking contact types", () => {
  it.each([
    ["905 123 456", "+421905123456"],
    ["0905 123 456", "+421905123456"],
    ["+421 905 123 456", "+421905123456"],
    ["00421 905 123 456", "+421905123456"],
  ])("normalizes Slovak phone %s", (input, expected) => {
    expect(normalizeSlovakPhone(input)).toBe(expected);
  });

  it.each(["       ", "call me", "123", "+421 12 34"])("rejects invalid phone %s", (input) => {
    const result = contactSchema.safeParse({
      meno: "Jana",
      priezvisko: "Nova",
      email: "jana@example.sk",
      phone: input,
    });

    if (input.trim().length === 0) {
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.phone).toBeUndefined();
    } else {
      expect(result.success).toBe(false);
    }
  });

  it("returns normalized phone from parsed contact data", () => {
    const result = contactSchema.safeParse({
      meno: " Jana ",
      priezvisko: " Nova ",
      email: "Jana@Example.sk",
      phone: "0905 123 456",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      meno: "Jana",
      priezvisko: "Nova",
      email: "Jana@Example.sk",
      phone: "+421905123456",
    });
  });
});

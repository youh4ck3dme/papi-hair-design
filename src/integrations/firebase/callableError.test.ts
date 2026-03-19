import { describe, expect, it } from "vitest";
import { toCallableErrorMessage } from "./callableError";

describe("toCallableErrorMessage", () => {
  it("maps known detail code to user-facing message", () => {
    const message = toCallableErrorMessage(
      { details: { code: "slot_unavailable" }, message: "backend message" },
      "fallback"
    );

    expect(message).toBe("Vybraný termín už nie je dostupný. Vyberte prosím iný čas.");
  });

  it("falls back to original error message for unknown code", () => {
    const message = toCallableErrorMessage(
      { code: "functions/internal", message: "Internal backend error" },
      "fallback"
    );

    expect(message).toBe("Internal backend error");
  });

  it("uses fallback message when error has no message", () => {
    const message = toCallableErrorMessage({}, "fallback");
    expect(message).toBe("fallback");
  });
});


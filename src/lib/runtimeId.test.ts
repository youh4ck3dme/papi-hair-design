import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeId } from "./runtimeId";

describe("createRuntimeId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when it is available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-123"),
      getRandomValues: vi.fn(),
    });

    expect(createRuntimeId("booking")).toBe("booking_uuid-123");
  });

  it("falls back to crypto.getRandomValues without using Math.random", () => {
    const getRandomValues = vi.fn((array: Uint8Array) => {
      array.set([0, 1, 2, 3]);
      return array;
    });

    vi.stubGlobal("crypto", {
      getRandomValues,
    });

    const result = createRuntimeId("consent");

    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(result).toMatch(/^consent_[a-z0-9]+-00010203/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRuntimeId } from "./runtimeId";

describe("createRuntimeId", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T12:00:00.000Z"));
    vi.stubGlobal("performance", {
      now: vi.fn(() => 12.345),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("creates prefixed runtime ids from deterministic time entropy", () => {
    const result = createRuntimeId("booking");

    expect(result).toMatch(/^booking_[a-z0-9]+-[a-z0-9]+-1$/);
  });

  it("returns unique ids across sequential calls without crypto", () => {
    const first = createRuntimeId("consent");
    const second = createRuntimeId("consent");

    expect(first).not.toBe(second);
    expect(first).toMatch(/^consent_[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
    expect(second).toMatch(/^consent_[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
  });
});

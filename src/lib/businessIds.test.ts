import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS_ID, withBusinessIdFallbacks } from "@/lib/businessIds";

describe("businessIds", () => {
  it("uses primary/default business id as first candidate", () => {
    const candidates = withBusinessIdFallbacks();

    expect(candidates[0]).toBe(DEFAULT_BUSINESS_ID);
  });

  it("includes provided primary id before defaults", () => {
    const candidates = withBusinessIdFallbacks("custom-business");

    expect(candidates[0]).toBe("custom-business");
    expect(candidates).toContain(DEFAULT_BUSINESS_ID);
  });

  it("deduplicates repeated IDs", () => {
    const candidates = withBusinessIdFallbacks(DEFAULT_BUSINESS_ID);

    expect(new Set(candidates).size).toBe(candidates.length);
  });
});


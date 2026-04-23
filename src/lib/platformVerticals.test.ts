import { describe, expect, it } from "vitest";

import { PLATFORM_VERTICAL_COUNT, PLATFORM_VERTICAL_GROUPS, PLATFORM_VERTICAL_KEYS } from "./platformVerticals";

describe("platformVerticals", () => {
  it("keeps a unique white-label shortlist across supported service verticals", () => {
    expect(PLATFORM_VERTICAL_COUNT).toBe(22);
    expect(new Set(PLATFORM_VERTICAL_KEYS).size).toBe(PLATFORM_VERTICAL_COUNT);
    expect(PLATFORM_VERTICAL_KEYS).toEqual(
      expect.arrayContaining([
        "hairStyling",
        "nails",
        "dentalCare",
        "medical",
        "pets",
        "physiotherapy",
        "counsellingTherapy",
      ]),
    );
  });

  it("assigns every vertical to exactly one buyer-facing group", () => {
    const groupedKeys = PLATFORM_VERTICAL_GROUPS.flatMap((group) => group.verticals);

    expect(groupedKeys).toHaveLength(PLATFORM_VERTICAL_COUNT);
    expect(new Set(groupedKeys).size).toBe(PLATFORM_VERTICAL_COUNT);
    expect(new Set(groupedKeys)).toEqual(new Set(PLATFORM_VERTICAL_KEYS));
  });
});

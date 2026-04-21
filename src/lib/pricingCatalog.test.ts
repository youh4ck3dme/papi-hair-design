import { describe, expect, it } from "vitest";

import type { ServiceRow } from "@/components/booking/types";
import { buildPricingCatalog } from "@/lib/pricingCatalog";

function makeService(overrides: Partial<ServiceRow>): ServiceRow {
  return {
    id: "service-id",
    name_sk: "Pánsky strih",
    description_sk: null,
    price: 20,
    duration_minutes: 45,
    buffer_minutes: 0,
    sort_order: null,
    is_active: true,
    business_id: "biz-1",
    category: "panske",
    subcategory: "Vlasy",
    subcategory_id: null,
    ...overrides,
  };
}

describe("buildPricingCatalog", () => {
  it("builds the three public pricing categories from admin services", () => {
    const catalog = buildPricingCatalog([
      makeService({ id: "svc-1", name_sk: "Pánsky strih", category: "panske", subcategory: "Vlasy" }),
      makeService({ id: "svc-2", name_sk: "Dámsky strih", category: "damske", subcategory: "Strih" }),
      makeService({ id: "svc-3", name_sk: "Depilácia nosa aj uši", category: "panske", subcategory: "Doplnkové služby" }),
    ]);

    expect(catalog.map((category) => category.title)).toEqual([
      "Pánske služby",
      "Dámske služby",
      "Doplnkové služby",
    ]);
    expect(catalog[0]?.serviceCount).toBe(1);
    expect(catalog[1]?.serviceCount).toBe(1);
    expect(catalog[2]?.serviceCount).toBe(1);
  });

  it("moves panske doplnkové služby into the dedicated doplnkové category", () => {
    const catalog = buildPricingCatalog([
      makeService({ id: "svc-1", name_sk: "Depilácia nosa aj uši", category: "panske", subcategory: "Doplnkové služby" }),
      makeService({ id: "svc-2", name_sk: "Ušné sviečky", category: "panske", subcategory: "Doplnkové služby" }),
    ]);

    expect(catalog[0]?.serviceCount).toBe(0);
    expect(catalog[2]?.sections[0]?.name).toBe("Doplnkové služby");
    expect(catalog[2]?.sections[0]?.services.map((service) => service.name_sk)).toEqual([
      "Depilácia nosa aj uši",
      "Ušné sviečky",
    ]);
  });
});

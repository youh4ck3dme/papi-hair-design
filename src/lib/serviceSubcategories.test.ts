import { describe, expect, it } from "vitest";
import {
  buildServiceSubcategoryGroups,
  buildServiceSubcategoryOptions,
  filterServicesBySubcategoryOption,
  resolveServiceCategory,
  slugifySubcategoryName,
  type ServiceCatalogLike,
  type ServiceSubcategoryRow,
  UNCATEGORIZED_SUBCATEGORY_KEY,
} from "./serviceSubcategories";

function makeService(overrides: Partial<ServiceCatalogLike> = {}): ServiceCatalogLike {
  return {
    id: "svc-1",
    name_sk: "Dámsky strih",
    category: "damske",
    subcategory: null,
    subcategory_id: null,
    sort_order: null,
    ...overrides,
  };
}

function makeSubcategory(overrides: Partial<ServiceSubcategoryRow> = {}): ServiceSubcategoryRow {
  return {
    id: "sub-1",
    business_id: "biz-1",
    category: "damske",
    name_sk: "Strih",
    slug: "strih",
    sort_order: 100,
    is_active: true,
    ...overrides,
  };
}

describe("serviceSubcategories", () => {
  it("slugifies Slovak names into stable ids", () => {
    expect(slugifySubcategoryName("Vlasy a brada")).toBe("vlasy-a-brada");
    expect(slugifySubcategoryName("Fúkaná")).toBe("fukana");
  });

  it("keeps explicit booking categories and infers legacy ones from the service name", () => {
    expect(resolveServiceCategory(makeService({ category: "panske" }))).toBe("panske");
    expect(resolveServiceCategory(makeService({ category: "ostatne", name_sk: "Úprava brady" }))).toBe("panske");
    expect(resolveServiceCategory(makeService({ category: "ostatne", name_sk: "Farbenie" }))).toBe("damske");
  });

  it("builds ordered subcategory options from Firestore docs and legacy string fallbacks", () => {
    const services = [
      makeService({ id: "svc-1", name_sk: "Dámsky strih", subcategory: "Strih", subcategory_id: "sub-1" }),
      makeService({ id: "svc-2", name_sk: "Farbenie", subcategory: "Farbenie" }),
      makeService({ id: "svc-3", name_sk: "Regenerácia", subcategory: null }),
    ];

    const options = buildServiceSubcategoryOptions(services, [makeSubcategory()], "damske");

    expect(options.map((option) => option.key)).toEqual([
      "subcategory:sub-1",
      "legacy:farbenie",
      UNCATEGORIZED_SUBCATEGORY_KEY,
    ]);
    expect(options[0]?.serviceCount).toBe(1);
    expect(options[1]?.serviceCount).toBe(1);
    expect(options[2]?.serviceCount).toBe(1);
  });

  it("filters services by selected option and preserves manual sort_order inside a bucket", () => {
    const services = [
      makeService({ id: "svc-1", name_sk: "Strih A", subcategory: "Strih", subcategory_id: "sub-1", sort_order: 200 }),
      makeService({ id: "svc-2", name_sk: "Strih B", subcategory: "Strih", subcategory_id: "sub-1", sort_order: 100 }),
      makeService({ id: "svc-3", name_sk: "Farbenie", subcategory: "Farbenie" }),
    ];
    const subcategories = [makeSubcategory({ id: "sub-1", name_sk: "Strih" })];
    const selectedOption = buildServiceSubcategoryOptions(services, subcategories, "damske")[0] ?? null;

    const filtered = filterServicesBySubcategoryOption(services, "damske", selectedOption);

    expect(filtered.map((service) => service.id)).toEqual(["svc-2", "svc-1"]);
  });

  it("creates dashboard groups including empty managed subcategories when requested", () => {
    const services = [makeService({ id: "svc-1", name_sk: "Dámsky strih", subcategory: "Strih", subcategory_id: "sub-1" })];
    const subcategories = [
      makeSubcategory({ id: "sub-1", name_sk: "Strih", sort_order: 100 }),
      makeSubcategory({ id: "sub-2", name_sk: "Balayage", slug: "balayage", sort_order: 200 }),
    ];

    const groups = buildServiceSubcategoryGroups(services, subcategories, "damske", {
      includeEmpty: true,
      uncategorizedLabel: "Bez podkategórie",
    });

    expect(groups.map((group) => group.option.name_sk)).toEqual([
      "Strih",
      "Balayage",
      "Bez podkategórie",
    ]);
    expect(groups[1]?.services).toHaveLength(0);
  });
});

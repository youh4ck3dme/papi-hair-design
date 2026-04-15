import { describe, expect, it } from "vitest";

import {
  findManagedServiceSubcategoryByName,
  getManagedServiceSubcategoryDefinitions,
  getManagedServiceSubcategoryId,
  inferManagedServiceSubcategory,
  resolveManagedServiceCategory,
  resolveManagedServiceSubcategoryForService,
} from "./serviceSubcategoryBlueprint";

describe("serviceSubcategoryBlueprint", () => {
  it("defines the expected public booking order for damske and panske categories", () => {
    expect(getManagedServiceSubcategoryDefinitions("damske").map((definition) => definition.name_sk)).toEqual([
      "Balayage",
      "Farbenie",
      "Fúkaná",
      "Melír",
      "Napájanie vlasov",
      "Odfarbovanie",
      "Regenerácia",
      "Strih",
      "Účesy",
    ]);

    expect(getManagedServiceSubcategoryDefinitions("panske").map((definition) => definition.name_sk)).toEqual([
      "Brada",
      "Doplnkové služby",
      "Farba",
      "Vlasy",
      "Vlasy a brada",
    ]);
  });

  it("infers ladies services into the desired managed subcategories", () => {
    expect(inferManagedServiceSubcategory("Balayage komplet", "damske")?.name_sk).toBe("Balayage");
    expect(inferManagedServiceSubcategory("Melír dorábka", "damske")?.name_sk).toBe("Melír");
    expect(inferManagedServiceSubcategory("Farbenie odrastov so strihom", "damske")?.name_sk).toBe("Farbenie");
    expect(inferManagedServiceSubcategory("Fúkaná polodlhé vlasy", "damske")?.name_sk).toBe("Fúkaná");
    expect(inferManagedServiceSubcategory("Aplikácia Tape-in", "damske")?.name_sk).toBe("Napájanie vlasov");
    expect(inferManagedServiceSubcategory("Gumovanie alebo čistenie farby", "damske")?.name_sk).toBe("Odfarbovanie");
    expect(inferManagedServiceSubcategory("Methamorphyc - exkluzívna kúra", "damske")?.name_sk).toBe("Regenerácia");
    expect(inferManagedServiceSubcategory("Dámsky strih", "damske")?.name_sk).toBe("Strih");
    expect(inferManagedServiceSubcategory("Spoločenský účes", "damske")?.name_sk).toBe("Účesy");
  });

  it("infers mens services into the desired managed subcategories", () => {
    expect(inferManagedServiceSubcategory("Úprava brady", "panske")?.name_sk).toBe("Brada");
    expect(inferManagedServiceSubcategory("Depilácia nosa aj uši", "panske")?.name_sk).toBe("Doplnkové služby");
    expect(inferManagedServiceSubcategory("Farbenie brady", "panske")?.name_sk).toBe("Farba");
    expect(inferManagedServiceSubcategory("Pánsky strih", "panske")?.name_sk).toBe("Vlasy");
    expect(inferManagedServiceSubcategory("Kombinácia vlasy a brada", "panske")?.name_sk).toBe("Vlasy a brada");
  });

  it("resolves managed category from backfill matchers before falling back to legacy heuristics", () => {
    expect(resolveManagedServiceCategory({ name_sk: "Trvalá", category: null })).toBe("panske");
    expect(resolveManagedServiceCategory({ name_sk: "Zosvetlenie vlasov", category: null })).toBe("panske");
    expect(resolveManagedServiceCategory({ name_sk: "Balayage komplet", category: null })).toBe("damske");
  });

  it("prefers explicit subcategory names before name inference", () => {
    const resolved = resolveManagedServiceSubcategoryForService({
      name_sk: "Neznáma premium služba",
      category: "damske",
      subcategory: "Balayage",
    });

    expect(resolved?.name_sk).toBe("Balayage");
  });

  it("creates stable business-scoped document ids", () => {
    const definition = findManagedServiceSubcategoryByName("panske", "Farba");
    expect(definition).not.toBeNull();
    expect(getManagedServiceSubcategoryId("papi-hair-design-main", definition!)).toBe(
      "papi-hair-design-main_farba",
    );
  });
});

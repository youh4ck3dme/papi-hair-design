import { describe, expect, it } from "vitest";
import { buildServiceSubcategoryAuditEntry } from "../src/serviceSubcategoryAudit";

function makeSnapshot(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

describe("buildServiceSubcategoryAuditEntry", () => {
  it("classifies create events", () => {
    const entry = buildServiceSubcategoryAuditEntry(
      null,
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 100,
        is_active: true,
      }),
    );

    expect(entry?.action).toBe("create");
    expect(entry?.subcategory_id).toBe("sub-1");
    expect(entry?.before).toBeNull();
    expect(entry?.after?.name_sk).toBe("Balayage");
  });

  it("classifies delete events", () => {
    const entry = buildServiceSubcategoryAuditEntry(
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 100,
        is_active: true,
      }),
      null,
    );

    expect(entry?.action).toBe("delete");
    expect(entry?.after).toBeNull();
  });

  it("classifies sort_order-only changes as reorder", () => {
    const entry = buildServiceSubcategoryAuditEntry(
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 100,
        is_active: true,
      }),
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 200,
        is_active: true,
      }),
    );

    expect(entry?.action).toBe("reorder");
    expect(entry?.changed_fields).toEqual(["sort_order"]);
  });

  it("classifies content changes as update", () => {
    const entry = buildServiceSubcategoryAuditEntry(
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 100,
        is_active: true,
      }),
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "panske",
        name_sk: "Brada",
        slug: "brada",
        sort_order: 100,
        is_active: false,
      }),
    );

    expect(entry?.action).toBe("update");
    expect(entry?.changed_fields).toEqual(["category", "name_sk", "slug", "is_active"]);
  });

  it("skips no-op updates", () => {
    const entry = buildServiceSubcategoryAuditEntry(
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 100,
        is_active: true,
      }),
      makeSnapshot("sub-1", {
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 100,
        is_active: true,
      }),
    );

    expect(entry).toBeNull();
  });
});

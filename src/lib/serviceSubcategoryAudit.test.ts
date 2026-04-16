import { describe, expect, it } from "vitest";
import {
  formatServiceSubcategoryAuditField,
  getServiceSubcategoryAuditActionLabel,
  normalizeServiceSubcategoryAudit,
  resolveServiceSubcategoryAuditName,
  sortServiceSubcategoryAudit,
} from "./serviceSubcategoryAudit";

function makeAuditDoc(data: Record<string, unknown>) {
  return {
    id: String(data.id ?? "audit-1"),
    data: () => data,
  };
}

describe("serviceSubcategoryAudit", () => {
  it("normalizes audit rows with before/after snapshots", () => {
    const audit = normalizeServiceSubcategoryAudit(
      makeAuditDoc({
        id: "audit-1",
        business_id: "biz-1",
        subcategory_id: "sub-1",
        action: "update",
        changed_fields: ["name_sk", "sort_order"],
        actor_auth_type: null,
        actor_auth_id: null,
        created_at: "2026-04-16T12:00:00.000Z",
        before: {
          id: "sub-1",
          business_id: "biz-1",
          category: "damske",
          name_sk: "Balayage",
          slug: "balayage",
          sort_order: 100,
          is_active: true,
        },
        after: {
          id: "sub-1",
          business_id: "biz-1",
          category: "damske",
          name_sk: "Balayage Premium",
          slug: "balayage-premium",
          sort_order: 200,
          is_active: true,
        },
      }),
    );

    expect(audit.action).toBe("update");
    expect(audit.before?.name_sk).toBe("Balayage");
    expect(audit.after?.name_sk).toBe("Balayage Premium");
    expect(audit.changed_fields).toEqual(["name_sk", "sort_order"]);
  });

  it("sorts newest entries first", () => {
    const sorted = sortServiceSubcategoryAudit([
      normalizeServiceSubcategoryAudit(
        makeAuditDoc({
          id: "audit-old",
          action: "create",
          created_at: "2026-04-16T08:00:00.000Z",
        }),
      ),
      normalizeServiceSubcategoryAudit(
        makeAuditDoc({
          id: "audit-new",
          action: "delete",
          created_at: "2026-04-16T12:00:00.000Z",
        }),
      ),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(["audit-new", "audit-old"]);
  });

  it("resolves a human-friendly subcategory name", () => {
    const fromAfter = normalizeServiceSubcategoryAudit(
      makeAuditDoc({
        id: "audit-1",
        action: "create",
        after: { id: "sub-1", name_sk: "Brada" },
      }),
    );
    const fallback = normalizeServiceSubcategoryAudit(makeAuditDoc({ id: "audit-2", action: "delete" }));

    expect(resolveServiceSubcategoryAuditName(fromAfter)).toBe("Brada");
    expect(resolveServiceSubcategoryAuditName(fallback)).toBe("Neznáma podkategória");
  });

  it("returns readable action and field labels", () => {
    expect(getServiceSubcategoryAuditActionLabel("reorder")).toBe("Presun");
    expect(formatServiceSubcategoryAuditField("sort_order")).toBe("Poradie");
    expect(formatServiceSubcategoryAuditField("custom_field")).toBe("custom_field");
  });
});

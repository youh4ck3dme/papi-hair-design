import { describe, expect, it } from "vitest";
import { buildAdminCalendarCsv, buildAdminCalendarPrintHtml } from "./adminCalendarExport";

const rows = [
  {
    reference: "ref-1",
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhone: "+421905123456",
    serviceName: "Konzultacia",
    employeeName: "Tim A",
    start: new Date("2026-03-12T09:00:00.000Z"),
    end: new Date("2026-03-12T10:00:00.000Z"),
    status: "Potvrdena",
    note: "Interna poznamka",
  },
];

describe("adminCalendarExport", () => {
  it("builds CSV content for export", () => {
    const csv = buildAdminCalendarCsv(rows);
    expect(csv).toContain("Referencia;Klient;Email");
    expect(csv).toContain("ref-1;Test User;test@example.com");
  });

  it("builds print HTML", () => {
    const html = buildAdminCalendarPrintHtml("12. marec 2026", rows);
    expect(html).toContain("PAPI HAIR DESIGN - Denný prehľad");
    expect(html).toContain("Test User");
    expect(html).toContain("Interna poznamka");
  });

  it("escapes user-controlled print fields before embedding them into HTML", () => {
    const html = buildAdminCalendarPrintHtml("<script>alert(1)</script>", [{
      ...rows[0],
      customerName: "<img src=x onerror=alert(1)>",
      note: "<b>unsafe</b>",
    }]);

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<b>unsafe</b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;b&gt;unsafe&lt;/b&gt;");
  });
});

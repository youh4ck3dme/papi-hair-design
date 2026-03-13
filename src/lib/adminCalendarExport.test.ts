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
    expect(html).toContain("FYZIO&FIT - Denny prehlad");
    expect(html).toContain("Test User");
    expect(html).toContain("Interna poznamka");
  });
});

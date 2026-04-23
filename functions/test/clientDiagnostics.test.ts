import { describe, expect, it } from "vitest";
import {
  buildClientDiagnosticRecord,
  sanitizeDiagnosticMetadata,
  sanitizeDiagnosticRoute,
} from "../src/clientDiagnostics";

describe("clientDiagnostics helpers", () => {
  it("normalizes routes to path-only values", () => {
    expect(sanitizeDiagnosticRoute("https://booking.papihairdesign.sk/booking?token=123#frag")).toBe("/booking");
    expect(sanitizeDiagnosticRoute("/admin/calendar?view=day")).toBe("/admin/calendar");
    expect(sanitizeDiagnosticRoute("not-a-route")).toBe("/not-a-route");
    expect(sanitizeDiagnosticRoute("mailto:owner@example.com")).toBeNull();
    expect(sanitizeDiagnosticRoute("javascript:alert(1)")).toBeNull();
  });

  it("keeps only primitive metadata values and truncates strings", () => {
    const metadata = sanitizeDiagnosticMetadata({
      ok: true,
      retries: 2,
      detail: "x".repeat(220),
      nested: { ignore: true },
      tags: ["ignore"],
      nullable: null,
    });

    expect(metadata.ok).toBe(true);
    expect(metadata.retries).toBe(2);
    expect(metadata.nullable).toBeNull();
    expect(typeof metadata.detail).toBe("string");
    expect((metadata.detail as string).length).toBeLessThanOrEqual(160);
    expect(metadata).not.toHaveProperty("nested");
    expect(metadata).not.toHaveProperty("tags");
  });

  it("builds redacted bounded records", () => {
    const record = buildClientDiagnosticRecord({
      category: "runtime_error",
      message: "Crash for user test@example.com",
      route: "https://booking.papihairdesign.sk/auth?token=secret",
      source: "window.error",
      stack: "Error: test@example.com failed\nat line 1",
      metadata: {
        email: "owner@example.com",
        status: "fatal",
      },
      session_id: "diag_123",
    });

    expect(record.message).not.toContain("test@example.com");
    expect(record.route).toBe("/auth");
    expect(record.source).toBe("window.error");
    expect(record.stack).not.toContain("test@example.com");
    expect(record.metadata.email).toBe("[redacted-email]");
    expect(record.fingerprint).toBeTruthy();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installGlobalDiagnostics,
  reportClientDiagnostic,
  resetDiagnosticsForTests,
} from "./diagnostics";

const diagnosticsMocks = vi.hoisted(() => ({
  recordClientDiagnostic: vi.fn(async () => ({ ok: true, id: "diag-1", fingerprint: "fp-1" })),
}));

vi.mock("@/integrations/firebase/recordClientDiagnostic", () => diagnosticsMocks);

describe("diagnostics helpers", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", "true");
    resetDiagnosticsForTests();
    diagnosticsMocks.recordClientDiagnostic.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("deduplicates identical diagnostics per session", async () => {
    await reportClientDiagnostic({
      category: "runtime_error",
      message: "Test failure",
      route: "/booking?token=secret",
      source: "window.error",
    });

    await reportClientDiagnostic({
      category: "runtime_error",
      message: "Test failure",
      route: "/booking?token=secret",
      source: "window.error",
    });

    expect(diagnosticsMocks.recordClientDiagnostic).toHaveBeenCalledTimes(1);
    expect(diagnosticsMocks.recordClientDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/booking",
        session_id: expect.stringContaining("diag_"),
      }),
    );
  });

  it("sanitizes metadata and redacts email addresses", async () => {
    await reportClientDiagnostic({
      category: "bootstrap_error",
      message: "Failure for owner@example.com",
      source: "bootstrap.preflight",
      metadata: {
        email: "owner@example.com",
        retries: 2,
        nested: { no: true },
      },
    });

    expect(diagnosticsMocks.recordClientDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failure for [redacted-email]",
        metadata: expect.objectContaining({
          email: "[redacted-email]",
          retries: 2,
        }),
      }),
    );
  });

  it("captures unhandled rejections after global install", async () => {
    installGlobalDiagnostics();

    const rejectionEvent = new Event("unhandledrejection") as Event & {
      promise: Promise<void>;
      reason: unknown;
    };
    rejectionEvent.promise = Promise.resolve();
    rejectionEvent.reason = new Error("Unhandled booking failure");

    window.dispatchEvent(rejectionEvent);

    await Promise.resolve();
    await Promise.resolve();

    expect(diagnosticsMocks.recordClientDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "unhandled_rejection",
        message: "Unhandled booking failure",
      }),
    );
  });
});

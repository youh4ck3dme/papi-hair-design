import { describe, it, expect } from "vitest";
import {
    getFirebaseStatusLabel,
    getSummaryCardClassName,
} from "./diagnosticsHelpers";

describe("diagnosticsHelpers", () => {
    describe("getFirebaseStatusLabel", () => {
        it("returns — when configOk is null", () => {
            expect(getFirebaseStatusLabel(null, "idle", "idle")).toBe("—");
        });
        it("returns nenastavené (env) when configOk is false", () => {
            expect(getFirebaseStatusLabel(false, "ok", "ok")).toBe("nenastavené (env)");
        });
        it("returns OK when config true and DB ok", () => {
            expect(getFirebaseStatusLabel(true, "ok", "ok")).toBe("OK");
        });
        it("returns načítavam… when config true and loading", () => {
            expect(getFirebaseStatusLabel(true, "loading", "ok")).toBe("načítavam…");
            expect(getFirebaseStatusLabel(true, "ok", "loading")).toBe("načítavam…");
        });
        it("returns chyba when config true and not ok/loading", () => {
            expect(getFirebaseStatusLabel(true, "error", "ok")).toBe("chyba");
        });
    });

    describe("getSummaryCardClassName", () => {
        it("returns green border when overallOk", () => {
            expect(getSummaryCardClassName(true, false)).toBe(
                "border-green-500/50 bg-green-500/5",
            );
        });
        it("returns amber border when error", () => {
            expect(getSummaryCardClassName(false, true)).toBe(
                "border-amber-500/50 bg-amber-500/5",
            );
        });
        it("returns empty string when no ok and no errors", () => {
            expect(getSummaryCardClassName(false, false)).toBe("");
        });
    });
});

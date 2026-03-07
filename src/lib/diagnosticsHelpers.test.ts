import { describe, it, expect } from "vitest";
import {
    getSupabaseStatusLabel,
    getSummaryCardClassName,
} from "./diagnosticsHelpers";

describe("diagnosticsHelpers", () => {
    describe("getSupabaseStatusLabel", () => {
        it("returns — when supabaseEnv is null", () => {
            expect(getSupabaseStatusLabel(null, "idle", "idle")).toBe("—");
        });
        it("returns nenastavené (env) when supabaseEnv is false", () => {
            expect(getSupabaseStatusLabel(false, "ok", "ok")).toBe("nenastavené (env)");
        });
        it("returns OK when env true and DB ok", () => {
            expect(getSupabaseStatusLabel(true, "ok", "ok")).toBe("OK");
        });
        it("returns načítavam… when env true and loading", () => {
            expect(getSupabaseStatusLabel(true, "loading", "ok")).toBe("načítavam…");
            expect(getSupabaseStatusLabel(true, "ok", "loading")).toBe("načítavam…");
        });
        it("returns chyba when env true and not ok/loading", () => {
            expect(getSupabaseStatusLabel(true, "error", "ok")).toBe("chyba");
        });
    });

    describe("getSummaryCardClassName", () => {
        it("returns green border when overallOk", () => {
            expect(getSummaryCardClassName(true, false)).toBe(
                "border-green-500/50 bg-green-500/5",
            );
        });
        it("returns amber border when Supabase error", () => {
            expect(getSummaryCardClassName(false, true)).toBe(
                "border-amber-500/50 bg-amber-500/5",
            );
        });
        it("returns empty string when no ok and no errors", () => {
            expect(getSummaryCardClassName(false, false)).toBe("");
        });
    });
});

export type TestStatus = "idle" | "loading" | "ok" | "error";

/**
 * Returns a human-readable label for the Firebase connection status.
 * Used by DiagnosticsPage and its unit tests.
 */
export function getFirebaseStatusLabel(
    configOk: boolean | null,
    dbStatus: TestStatus,
    authStatus: TestStatus,
): string {
    if (configOk === null) return "—";
    if (!configOk) return "nenastavené (env)";
    if (dbStatus === "loading" || authStatus === "loading") return "načítavam…";
    if (dbStatus === "ok" && authStatus === "ok") return "OK";
    return "chyba";
}

/**
 * Returns a Tailwind class string for the summary card border/background
 * based on overall health status.
 */
export function getSummaryCardClassName(
    overallOk: boolean,
    hasError: boolean,
): string {
    if (overallOk) return "border-green-500/50 bg-green-500/5";
    if (hasError) return "border-amber-500/50 bg-amber-500/5";
    return "";
}

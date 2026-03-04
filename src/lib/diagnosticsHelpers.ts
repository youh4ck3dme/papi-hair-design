export type TestStatus = "idle" | "loading" | "ok" | "error";

/**
 * Returns a human-readable label for the Supabase connection status.
 * Used by DiagnosticsPage and its unit tests.
 */
export function getSupabaseStatusLabel(
    supabaseEnv: boolean | null,
    dbStatus: TestStatus,
    authStatus: TestStatus,
): string {
    if (supabaseEnv === null) return "—";
    if (!supabaseEnv) return "nenastavené (env)";
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
    hasFirebaseError: boolean,
    hasSupabaseError: boolean,
): string {
    if (overallOk) return "border-green-500/50 bg-green-500/5";
    if (hasFirebaseError || hasSupabaseError) return "border-amber-500/50 bg-amber-500/5";
    return "";
}

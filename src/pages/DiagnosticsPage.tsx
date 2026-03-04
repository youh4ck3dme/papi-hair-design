import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { TestStatus } from "@/lib/diagnosticsHelpers";

const DIAGNOSTICS_KEY = "diagnostics";
const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const EXPECTED_SUPABASE_PROJECT = import.meta.env.VITE_SUPABASE_URL
  ? new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]
  : "Neznámy";

function StatusIcon({ status }: Readonly<{ status: TestStatus }>) {
  if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
  return null;
}

function renderStatusBlock(
  status: TestStatus,
  errorMessage: string | null,
  okContent?: ReactNode
): ReactNode {
  if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === "ok") return okContent ?? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (status === "error") return <span className="text-sm text-destructive">{errorMessage ?? "Chyba"}</span>;
  return null;
}

export default function DiagnosticsPage() {
  const [searchParams] = useSearchParams();
  const [supabaseEnv, setSupabaseEnv] = useState<boolean | null>(null);
  const [supabaseDbStatus, setSupabaseDbStatus] = useState<TestStatus>("idle");
  const [supabaseDbError, setSupabaseDbError] = useState<string | null>(null);
  const [supabaseRpcStatus, setSupabaseRpcStatus] = useState<TestStatus>("idle");
  const [supabaseRpcError, setSupabaseRpcError] = useState<string | null>(null);

  const allowed =
    import.meta.env.DEV === true ||
    searchParams.get("key") === DIAGNOSTICS_KEY;

  useEffect(() => {
    const sbUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const sbKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
    setSupabaseEnv(Boolean(sbUrl && sbKey));
  }, []);

  useEffect(() => {
    if (!allowed || !supabaseEnv) return;
    const run = async () => {
      setSupabaseDbStatus("loading");
      setSupabaseDbError(null);
      try {
        const { error } = await supabase.from("businesses").select("id").limit(1);
        setSupabaseDbStatus(error ? "error" : "ok");
        if (error) setSupabaseDbError(error.message ?? "Chyba dotazu");
      } catch (e) {
        setSupabaseDbStatus("error");
        setSupabaseDbError((e as Error).message ?? "Chyba");
      }
    };
    run();
  }, [allowed, supabaseEnv]);

  useEffect(() => {
    if (!allowed || !supabaseEnv) return;
    const run = async () => {
      setSupabaseRpcStatus("loading");
      setSupabaseRpcError(null);
      try {
        const { error } = await supabase.rpc("rpc_get_public_business_info", {
          _business_id: DEMO_BUSINESS_ID,
        });
        setSupabaseRpcStatus(error ? "error" : "ok");
        if (error) setSupabaseRpcError(error.message ?? "Chyba RPC");
      } catch (e) {
        setSupabaseRpcStatus("error");
        setSupabaseRpcError((e as Error).message ?? "Chyba");
      }
    };
    run();
  }, [allowed, supabaseEnv]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Not found</p>
      </div>
    );
  }

  const anySupabaseError = supabaseDbStatus === "error" || supabaseRpcStatus === "error";
  const overallOk = supabaseEnv && supabaseDbStatus === "ok";
  const summaryClassName = `relative overflow-hidden ${overallOk ? "border-green-500/50 bg-green-500/5" : ""
    } ${anySupabaseError ? "border-red-500/50 bg-red-500/5" : ""}`;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Diagnostika: Supabase</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Test pripojenia na databázu. Otvor s <code className="rounded bg-muted px-1">?key=diagnostics</code> v produkcii.
      </p>

      <div className="space-y-4">
        <Card className={summaryClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Celkový stav
              {overallOk && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Supabase (DB + RPC): {overallOk ? "OK" : "Chyba"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Env (URL + Publishable Key)</span>
              <StatusIcon status={supabaseEnv ? "ok" : "error"} />
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all">
              Projekt: {EXPECTED_SUPABASE_PROJECT}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Tabuľka businesses</span>
              <span className="flex items-center gap-2">
                {renderStatusBlock(supabaseDbStatus, supabaseDbError)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">RPC rpc_get_public_business_info</span>
              <span className="flex items-center gap-2">
                {renderStatusBlock(supabaseRpcStatus, supabaseRpcError)}
              </span>
            </div>
          </CardContent>
        </Card>

        {anySupabaseError && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rýchly postup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Zabezpeč, že v <code className="rounded bg-muted px-1">.env</code> máš <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> a <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> správne nastavené.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

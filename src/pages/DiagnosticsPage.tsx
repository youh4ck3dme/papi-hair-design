import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/integrations/firebase/config";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { TestStatus } from "@/lib/diagnosticsHelpers";

const DIAGNOSTICS_KEY = "diagnostics";
const EXPECTED_FIREBASE_PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID || "Neznámy";

function StatusIcon({ status }: Readonly<{ status: TestStatus }>) {
  if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
  return null;
}

export default function DiagnosticsPage() {
  const [searchParams] = useSearchParams();
  const [firebaseEnv, setFirebaseEnv] = useState<boolean | null>(null);
  const [firebaseDbStatus, setFirebaseDbStatus] = useState<TestStatus>("idle");
  const [firebaseDbError, setFirebaseDbError] = useState<string | null>(null);

  const allowed =
    import.meta.env.DEV === true ||
    searchParams.get("key") === DIAGNOSTICS_KEY;

  useEffect(() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY ?? "";
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "";
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "";
    setFirebaseEnv(Boolean(apiKey && authDomain && projectId));
  }, []);

  useEffect(() => {
    if (!allowed || !firebaseEnv) return;
    const run = async () => {
      setFirebaseDbStatus("loading");
      setFirebaseDbError(null);
      try {
        await getDocs(query(collection(db, "businesses"), limit(1)));
        setFirebaseDbStatus("ok");
      } catch (error) {
        setFirebaseDbStatus("error");
        setFirebaseDbError((error as Error).message ?? "Chyba");
      }
    };
    run();
  }, [allowed, firebaseEnv]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Not found</p>
      </div>
    );
  }

  const overallOk = firebaseEnv && firebaseDbStatus === "ok";
  const hasFirebaseError = firebaseDbStatus === "error" || firebaseEnv === false;
  const summaryClassName = `relative overflow-hidden ${overallOk ? "border-green-500/50 bg-green-500/5" : ""
    } ${hasFirebaseError ? "border-red-500/50 bg-red-500/5" : ""}`;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Diagnostika: Firebase</h1>
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
              Firebase (DB): {overallOk ? "OK" : "Chyba"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Firebase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Env (API key + Auth domain + Project ID)</span>
              <StatusIcon status={firebaseEnv ? "ok" : "error"} />
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all">
              Projekt: {EXPECTED_FIREBASE_PROJECT}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Kolekcia businesses</span>
              <span className="flex items-center gap-2">
                <StatusIcon status={firebaseDbStatus} />
                {firebaseDbStatus === "error" && <span className="text-sm text-destructive">{firebaseDbError ?? "Chyba"}</span>}
              </span>
            </div>
          </CardContent>
        </Card>

        {hasFirebaseError && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rýchly postup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Zabezpeč, že v <code className="rounded bg-muted px-1">.env</code> máš správne
                <code className="rounded bg-muted px-1 ml-1">VITE_FIREBASE_API_KEY</code>,
                <code className="rounded bg-muted px-1 ml-1">VITE_FIREBASE_AUTH_DOMAIN</code> a
                <code className="rounded bg-muted px-1 ml-1">VITE_FIREBASE_PROJECT_ID</code>.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

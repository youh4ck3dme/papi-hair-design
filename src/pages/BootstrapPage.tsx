import { useState } from "react";
import { db, auth } from "@/integrations/firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function BootstrapPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const runBootstrap = async () => {
        if (!auth.currentUser) {
            setStatus({ type: 'error', msg: "Musíš byť najprv prihlásený!" });
            return;
        }

        setLoading(true);
        setStatus(null);

        const businessId = "papi-hair-design-main";
        const uid = auth.currentUser.uid;
        const email = auth.currentUser.email;

        try {
            // 1. Create Business
            await setDoc(doc(db, "businesses", businessId), {
                name: "Papi Hair Design",
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
            }, { merge: true });

            // 2. Create Profile
            await setDoc(doc(db, "profiles", uid), {
                full_name: "Papi Admin",
                email: email,
                updated_at: serverTimestamp(),
            }, { merge: true });

            // 3. Create Membership (Owner)
            await setDoc(doc(db, "memberships", uid + "_" + businessId), {
                business_id: businessId,
                profile_id: uid,
                role: "owner",
                created_at: serverTimestamp(),
            }, { merge: true });

            setStatus({ type: 'success', msg: "Admin prístup bol úspešne vytvorený! Teraz môžeš prejsť do Dashboardu." });
        } catch (err: any) {
            console.error(err);
            setStatus({ type: 'error', msg: "Chyba: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        Admin Bootstrap
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-sm text-center text-muted-foreground">
                        Tento nástroj vytvorí tvoj admin profil a priradí ti rolu <strong>majiteľa</strong> v databáze.
                    </div>

                    {!user ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>Nie si prihlásený. Choď najprv na login stránku.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-muted text-xs font-mono break-all">
                                Prihlásený ako: {user.email}
                            </div>

                            <Button
                                onClick={runBootstrap}
                                disabled={loading}
                                className="w-full h-12 text-base font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Vytváram...
                                    </>
                                ) : (
                                    "Aktivovať Admin prístup"
                                )}
                            </Button>
                        </div>
                    )}

                    {status && (
                        <div className={`p-4 rounded-xl text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {status.msg}
                        </div>
                    )}

                    <div className="text-center">
                        <Button variant="link" onClick={() => window.location.href = '/admin'}>
                            Prejsť do Admin Dashboardu
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

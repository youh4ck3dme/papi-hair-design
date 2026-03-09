import { useState } from "react";
import { db, auth, functions } from "@/integrations/firebase/config";
import { doc, setDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
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

        try {
            const bootstrapAdminAccess = httpsCallable(functions, "bootstrapAdminAccess");
            await bootstrapAdminAccess({ business_id: businessId });
            setStatus({ type: 'success', msg: "Admin prístup a prvý provider boli úspešne vytvorené. Teraz môžeš prejsť do Dashboardu." });
        } catch (err: any) {
            console.error(err);
            setStatus({ type: 'error', msg: "Chyba: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    const seedBusinessData = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        setStatus(null);
        try {
            const batch = writeBatch(db);
            const bizId = "papi-hair-design-main";

            // 1. Business Hours
            const hours = [
                { day: "monday", start: "08:00", end: "17:00", mode: "open" },
                { day: "tuesday", start: "08:00", end: "17:00", mode: "open" },
                { day: "wednesday", start: "08:00", end: "17:00", mode: "open" },
                { day: "thursday", start: "08:00", end: "17:00", mode: "open" },
                { day: "friday", start: "08:00", end: "17:00", mode: "open" },
                { day: "saturday", mode: "on_request" },
                { day: "sunday", mode: "closed" },
            ];

            const bhQuery = await getDocs(query(collection(db, "business_hours"), where("business_id", "==", bizId)));
            bhQuery.docs.forEach(d => batch.delete(d.ref));
            hours.forEach((h, i) => {
                const ref = doc(collection(db, "business_hours"));
                batch.set(ref, {
                    business_id: bizId,
                    day_of_week: h.day,
                    mode: h.mode,
                    start_time: h.start || "09:00",
                    end_time: h.end || "17:00",
                    sort_order: i
                });
            });

            // 2. Services
            const services = [
                // Ladies
                { name: "Dámsky strih", price: 30 },
                { name: "Fúkaná dlhé vlasy", price: 30 },
                { name: "Fúkaná polodlhé vlasy", price: 20 },
                { name: "Finálny styling", price: 20 },
                { name: "Farbenie odrastov so strihom", price: 60 },
                { name: "Farbenie odrastov", price: 45 },
                { name: "Kompletné farbenie", price: 70 },
                { name: "Kompletné farbenie so strihom", price: 90 },
                { name: "Balayage komplet", price: 150 },
                { name: "Balayage dorábka", price: 120 },
                { name: "Melír dorábka", price: 120 },
                { name: "Melír komplet", price: 150 },
                { name: "Gumovanie alebo čistenie farby", price: 100 },
                { name: "Sťahovanie farby", price: 160 },
                { name: "Methamorphyc - rýchla kúra", price: 35 },
                { name: "Methamorphyc - exkluzívna kúra", price: 50 },
                { name: "Brazílsky keratín", price: 130 },
                { name: "Aplikácia Tape-in", price: 40 },
                { name: "Prepojenie Tape-in", price: 120 },
                { name: "Zapletané vrkôčiky", price: 30 },
                { name: "Spoločenský účes", price: 40 },
                // Mens
                { name: "Strih Junior (do 15r.)", price: 15 },
                { name: "Pánsky strih", price: 19 },
                { name: "Úprava brady", price: 12 },
                { name: "Kombinácia vlasy a brada", price: 27 },
                { name: "Pánsky špeciál", price: 50 },
                { name: "Trvalá", price: 40 },
                { name: "Zosvetlenie vlasov", price: 40 },
                { name: "Farbenie brady", price: 10 },
                { name: "Tónovanie sedín", price: 10 },
                // Extras
                { name: "Depilácia nosa aj uši", price: 5 },
                { name: "Ušné sviečky", price: 10 },
                { name: "Čierna zlupovacia maska", price: 12 },
            ];

            const svSnap = await getDocs(query(collection(db, "services"), where("business_id", "==", bizId)));
            svSnap.docs.forEach(d => batch.delete(d.ref));
            services.forEach((s, i) => {
                const ref = doc(collection(db, "services"));
                batch.set(ref, {
                    business_id: bizId,
                    name_sk: s.name,
                    price: s.price,
                    duration_minutes: 60,
                    is_active: true,
                    sort_order: i
                });
            });

            await batch.commit();
            setStatus({ type: 'success', msg: "Dáta (hodiny a služby) boli úspešne nahraté!" });
        } catch (err: any) {
            console.error(err);
            setStatus({ type: 'error', msg: "Chyba pri nahrávaní: " + err.message });
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

                            <Button
                                onClick={seedBusinessData}
                                disabled={loading}
                                variant="outline"
                                className="w-full h-12 text-base font-semibold border-gold text-gold hover:bg-gold hover:text-white"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Nahrávam dáta...
                                    </>
                                ) : (
                                    "Nahrať Služby & Hodiny"
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

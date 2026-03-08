import { useEffect, useState } from "react";
import { db, functions } from "@/integrations/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Mail, Users, Shield } from "lucide-react";
import { BusinessHoursEditor } from "@/components/admin/BusinessHoursEditor";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { businessId, isOwner } = useBusiness();
  const [business, setBusiness] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  // Predvolená SMTP pre Papi Hair Design (Websupport) – odosielateľ aj prijemca: booking@papihairdesign.sk
  const DEFAULT_SMTP = {
    host: "smtp.m1.websupport.sk",
    port: "465",
    user: "booking@papihairdesign.sk",
    from: "booking@papihairdesign.sk",
  };
  const [smtpForm, setSmtpForm] = useState({
    host: DEFAULT_SMTP.host,
    port: DEFAULT_SMTP.port,
    user: DEFAULT_SMTP.user,
    from: DEFAULT_SMTP.from,
    pass: "",
  });
  const [smtpHasPassword, setSmtpHasPassword] = useState(false);

  useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  useEffect(() => {
    // Load business WITHOUT smtp_config – passwords should never reach the client
    const loadBusiness = async () => {
      try {
        const docRef = doc(db, "businesses", businessId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setBusiness({ id: snap.id, ...data });
          const smtp = data.smtp_config as any ?? {};
          setSmtpForm({
            host: (smtp.host ?? "").trim() || DEFAULT_SMTP.host,
            port: String(smtp.port ?? "").trim() || DEFAULT_SMTP.port,
            user: (smtp.user ?? "").trim() || DEFAULT_SMTP.user,
            from: (smtp.from ?? "").trim() || DEFAULT_SMTP.from,
            pass: "", // Never load actual password to client
          });
          setSmtpHasPassword(!!(smtp.pass));
        }
      } catch (err) {
        console.error("Error loading business info:", err);
      }
    };
    loadBusiness();
  }, [businessId]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "profiles", profile.id), {
        full_name: profileForm.full_name,
        phone: profileForm.phone || null,
        updated_at: new Date().toISOString()
      });
      await refreshProfile();
      toast.success("Profil aktualizovaný");
    } catch (err) {
      toast.error("Chyba pri ukladaní");
    } finally {
      setSaving(false);
    }
  };

  const saveBusiness = async () => {
    if (!business) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "businesses", businessId), {
        name: business.name,
        address: business.address,
        phone: business.phone,
        email: business.email,
        timezone: business.timezone,
        lead_time_minutes: business.lead_time_minutes,
        max_days_ahead: business.max_days_ahead,
        cancellation_hours: business.cancellation_hours,
        updated_at: new Date().toISOString()
      });
      toast.success("Nastavenia firmy aktualizované");
    } catch (err) {
      toast.error("Chyba pri ukladaní");
    } finally {
      setSaving(false);
    }
  };

  const setB = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBusiness((b: any) => ({ ...b, [k]: k.includes("minutes") || k.includes("hours") || k.includes("ahead") ? +e.target.value : e.target.value }));

  const saveSmtp = async () => {
    setSaving(true);
    try {
      const saveSmtpConfigFn = httpsCallable<any, any>(functions, "saveSmtpConfig");
      const { data } = await saveSmtpConfigFn({
        business_id: businessId,
        host: smtpForm.host,
        port: Number(smtpForm.port) || 465,
        user: smtpForm.user,
        from: smtpForm.from,
        pass: smtpForm.pass || undefined, // Only send if user typed a new password
      });

      if (!data.success) {
        toast.error("Chyba pri ukladaní SMTP");
        return;
      }

      toast.success("SMTP nastavenia uložené");
      if (smtpForm.pass) setSmtpHasPassword(true);
      setSmtpForm((f) => ({ ...f, pass: "" })); // Clear password from memory
    } catch (err) {
      console.error("SMTP save error:", err);
      toast.error("Chyba pri ukladaní SMTP");
    } finally {
      setSaving(false);
    }
  };

  const saveBookingSettings = async () => {
    if (!business) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "businesses", businessId), {
        allow_admin_as_provider: business.allow_admin_as_provider,
        updated_at: new Date().toISOString()
      });
      toast.success("Nastavenia booking uložené");
    } catch (err) {
      toast.error("Chyba pri ukladaní nastavení booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Nastavenia
        </h1>
        <p className="text-muted-foreground">Správa vašej firmy, profilu a systémových nastavení.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/30 backdrop-blur-md border border-primary/10 rounded-xl mb-6">
          <TabsTrigger value="general" className="rounded-lg py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Všeobecné</TabsTrigger>
          <TabsTrigger value="booking" className="rounded-lg py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Booking</TabsTrigger>
          <TabsTrigger value="hours" className="rounded-lg py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Otváracie hodiny</TabsTrigger>
          <TabsTrigger value="smtp" className="rounded-lg py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">SMTP Email</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-lg py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-0">
          {business && (
            <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-primary/5 bg-muted/20">
                <CardTitle className="text-lg font-bold">Nastavenia firmy</CardTitle>
                <CardDescription>Základné informácie o vašom podniku</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Názov firmy</Label>
                    <Input className="bg-background/50 border-primary/10 focus:ring-primary/20" value={business.name ?? ""} onChange={setB("name")} />
                  </div>
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Adresa</Label>
                    <Input className="bg-background/50 border-primary/10 focus:ring-primary/20" value={business.address ?? ""} onChange={setB("address")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Telefón</Label>
                    <Input className="bg-background/50 border-primary/10 focus:ring-primary/20" value={business.phone ?? ""} onChange={setB("phone")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Email</Label>
                    <Input className="bg-background/50 border-primary/10 focus:ring-primary/20" value={business.email ?? ""} onChange={setB("email")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Min. čas rezervácie vopred (min)</Label>
                    <Input className="bg-background/50 border-primary/10 focus:ring-primary/20" type="number" value={business.lead_time_minutes ?? 60} onChange={setB("lead_time_minutes")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Max. dní dopredu</Label>
                    <Input className="bg-background/50 border-primary/10 focus:ring-primary/20" type="number" value={business.max_days_ahead ?? 60} onChange={setB("max_days_ahead")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Storno lehota (hod)</Label>
                    <Input className="bg-background/50 border-primary/10 focus:ring-primary/20" type="number" value={business.cancellation_hours ?? 24} onChange={setB("cancellation_hours")} />
                  </div>
                </div>
                <div className="pt-4 border-t border-primary/5 flex justify-end">
                  <Button onClick={saveBusiness} disabled={saving} className="bg-gold hover:bg-gold/90 text-gold-foreground shadow-lg shadow-gold/20 px-8 transition-all hover:scale-105 active:scale-95">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Uložiť nastavenia
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="booking" className="space-y-6 mt-0">
          {business && (
            <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-primary/5 bg-muted/20">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Nastavenia rezervácií
                </CardTitle>
                <CardDescription>
                  Spravujte kto môže byť vybraný ako vykonávateľ služby
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between p-6 rounded-2xl border border-primary/10 bg-primary/5 group hover:bg-primary/10 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <Label className="text-base font-semibold text-foreground">
                        Povoliť administrátora ako vykonávateľa služby
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Keď je zapnuté, administrátori a majitelia s priradeným profilom zamestnanca
                      budú dostupní vo výbere pracovníkov pri vytváraní rezervácie služby.
                    </p>
                  </div>
                  <Switch
                    checked={business.allow_admin_as_provider ?? false}
                    disabled={!isOwner}
                    onCheckedChange={(checked) => {
                      setBusiness((b: any) => ({ ...b, allow_admin_as_provider: checked }));
                    }}
                    className="data-[state=checked]:bg-gold"
                  />
                </div>
                {!isOwner && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                    <p className="text-sm text-muted-foreground italic flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4 opacity-50" />
                      Toto nastavenie môže meniť iba majiteľ salónu.
                    </p>
                  </div>
                )}
                {isOwner && (
                  <div className="pt-4 border-t border-primary/5 flex justify-end">
                    <Button onClick={saveBookingSettings} disabled={saving} className="bg-gold hover:bg-gold/90 text-gold-foreground shadow-lg shadow-gold/20 px-8 transition-all hover:scale-105 active:scale-95">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Uložiť nastavenia
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hours" className="mt-0">
          <BusinessHoursEditor />
        </TabsContent>

        <TabsContent value="smtp" className="space-y-6 mt-0">
          <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-primary/5 bg-muted/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                SMTP Nastavenia
              </CardTitle>
              <CardDescription>Konfigurácia pre odosielanie notifikačných emailov</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">SMTP Server (host)</Label>
                  <Input
                    className="bg-background/50 border-primary/10 focus:ring-primary/20"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, host: e.target.value }))}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Port</Label>
                  <Input
                    className="bg-background/50 border-primary/10 focus:ring-primary/20"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, port: e.target.value }))}
                    placeholder="465"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Používateľ (login)</Label>
                  <Input
                    className="bg-background/50 border-primary/10 focus:ring-primary/20"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, user: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Odosielateľ (From)</Label>
                  <Input
                    className="bg-background/50 border-primary/10 focus:ring-primary/20"
                    value={smtpForm.from}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, from: e.target.value }))}
                    placeholder="booking@example.com"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                    Heslo {smtpHasPassword && <span className="text-[10px] text-muted-foreground border border-primary/10 px-1.5 py-0.5 rounded ml-2">ULOŽENÉ</span>}
                  </Label>
                  <Input
                    type="password"
                    className="bg-background/50 border-primary/10 focus:ring-primary/20"
                    value={smtpForm.pass}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, pass: e.target.value }))}
                    placeholder={smtpHasPassword ? "••••••••" : "Zadajte heslo"}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-primary/5 flex justify-end">
                <Button onClick={saveSmtp} disabled={saving} className="bg-gold hover:bg-gold/90 text-gold-foreground shadow-lg shadow-gold/20 px-8 transition-all hover:scale-105 active:scale-95">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Uložiť SMTP
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-primary/5 bg-muted/20">
              <CardTitle className="text-lg font-bold">Môj profil</CardTitle>
              <CardDescription>Osobné informácie správcu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Celé meno</Label>
                  <Input
                    className="bg-background/50 border-primary/10 focus:ring-primary/20"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Telefón</Label>
                  <Input
                    className="bg-background/50 border-primary/10 focus:ring-primary/20"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+421 900 000 000"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-primary/5 flex justify-end">
                <Button onClick={saveProfile} disabled={saving} className="bg-gold hover:bg-gold/90 text-gold-foreground shadow-lg shadow-gold/20 px-8 transition-all hover:scale-105 active:scale-95">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Uložiť profil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

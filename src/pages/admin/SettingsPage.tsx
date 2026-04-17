import { useCallback, useEffect, useMemo, useState } from "react";
import { db, functions, storage } from "@/integrations/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarCropper } from "@/components/admin/AvatarCropper";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";
import { Loader2, Save, Mail, Users, Shield, RefreshCw, KeyRound, Camera, Trash2 } from "lucide-react";
import { BusinessHoursEditor } from "@/components/admin/BusinessHoursEditor";
import type { FirebaseError } from "firebase/app";
import { compressProfileImage, readFileAsDataUrl, validateProfileImageBlob, validateProfileImageFile } from "@/lib/profileImage";
import {
  buildObservabilityAlerts,
  getAlertBadgeClasses,
  getObservabilityHealthLabel,
  getObservabilityHealthTone,
  getObservabilityToneClasses,
  getPersistedObservabilityStatusClasses,
  getPersistedObservabilityStatusLabel,
} from "@/lib/adminObservability";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
  isBlockedByClientError,
  warnBlockedByClientOnce,
} from "@/lib/firebaseClientErrors";

function friendlyError(err: unknown, fallback: string): string {
  const e = err as Partial<FirebaseError> | undefined;
  if (!e?.code) return fallback;
  if (e.code === "permission-denied" || e.code === "functions/permission-denied") {
    return "Nemáte oprávnenie meniť tieto nastavenia pre aktuálnu firmu.";
  }
  if (e.code === "unauthenticated" || e.code === "functions/unauthenticated") {
    return "Relácia vypršala. Prihláste sa znova.";
  }
  return fallback;
}

function mapAvatarUploadError(err: unknown): string {
  const code = getFirebaseErrorCode(err);
  const message = getFirebaseErrorMessage(err);

  if (isBlockedByClientError(err)) {
    return "Prehliadač blokuje upload požiadavky (Shields/AdBlock). Povoľte stránku a skúste znova.";
  }

  if (
    code === "storage/unauthorized" ||
    code === "permission-denied" ||
    code === "storage/unauthenticated"
  ) {
    return "Nemáte oprávnenie na nahratie profilovej fotky.";
  }

  if (
    message.includes("cors") ||
    message.includes("preflight") ||
    code === "storage/unknown"
  ) {
    return "Upload blokovaný CORS politikou Storage bucketu. Skontrolujte CORS konfiguráciu.";
  }

  if (code === "storage/quota-exceeded") {
    return "Úložisko je dočasne nedostupné (quota). Skúste to neskôr.";
  }

  return "Chyba pri nahrávaní fotky.";
}

function maybeWarnBlockedRequest(err: unknown) {
  if (isBlockedByClientError(err)) {
    warnBlockedByClientOnce((message) => toast.warning(message));
  }
}

function describeObservabilityLoadError(scope: string, err: unknown): string {
  const code = getFirebaseErrorCode(err);

  if (code === "failed-precondition") {
    return `${scope}: query zatiaľ čaká na vytvorenie Firestore indexu.`;
  }

  if (code === "permission-denied") {
    return `${scope}: chýbajú oprávnenia na čítanie observability dát.`;
  }

  if (code === "unavailable") {
    return `${scope}: Firestore je dočasne nedostupný.`;
  }

  return `${scope}: nepodarilo sa načítať dáta.`;
}

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { businessId, isOwner, isOwnerOrAdmin } = useBusiness();
  const [business, setBusiness] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [observabilityRefreshing, setObservabilityRefreshing] = useState(false);
  const [syncingObservabilityAlerts, setSyncingObservabilityAlerts] = useState(false);
  const [snapshotInfo, setSnapshotInfo] = useState<any>(null);
  const [snapshotHealth, setSnapshotHealth] = useState<any>(null);
  const [bookingFunnelHealth, setBookingFunnelHealth] = useState<any>(null);
  const [snapshotRebuildEvents, setSnapshotRebuildEvents] = useState<any[]>([]);
  const [opsAlerts, setOpsAlerts] = useState<any[]>([]);
  const [observabilityLoadIssues, setObservabilityLoadIssues] = useState<string[]>([]);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseState, setLicenseState] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [licenseMessage, setLicenseMessage] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", avatar_url: null as string | null });
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
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        avatar_url: profile.avatar_url ?? null,
      });
    }
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
          if (data.license_key) {
            setLicenseKey(data.license_key);
          }
          const smtp = data.smtp_config as any ?? {};
          setSmtpForm({
            host: (smtp.host ?? "").trim() || DEFAULT_SMTP.host,
            port: String(smtp.port ?? "").trim() || DEFAULT_SMTP.port,
            user: (smtp.user ?? "").trim() || DEFAULT_SMTP.user,
            from: (smtp.from ?? "").trim() || DEFAULT_SMTP.from,
            pass: "", // Never load actual password to client
          });
          setSmtpHasPassword(!!(smtp.has_password || smtp.password_secret));
        }
      } catch (err) {
        console.error("Error loading business info:", err);
      }
    };
    loadBusiness();
  }, [businessId]);

  const loadObservability = useCallback(async () => {
    setObservabilityRefreshing(true);
    try {
      const [snap, health, funnel, rebuildEventsSnap, opsAlertsSnap] = await Promise.allSettled([
        getDoc(doc(db, "public_snapshots", businessId)),
        getDoc(doc(db, "ops_health", `snapshot_${businessId}`)),
        getDoc(doc(db, "ops_health", `booking_funnel_${businessId}`)),
        getDocs(
          query(
            collection(db, "snapshot_rebuild_events"),
            where("business_id", "==", businessId),
            orderBy("created_at", "desc"),
            limit(8),
          ),
        ),
        getDocs(
          query(
            collection(db, "ops_alerts"),
            where("business_id", "==", businessId),
            orderBy("updated_at", "desc"),
            limit(12),
          ),
        ),
      ]);

      const issues: string[] = [];

      if (snap.status === "fulfilled") {
        setSnapshotInfo(snap.value.exists() ? { id: snap.value.id, ...snap.value.data() } : null);
      } else {
        issues.push(describeObservabilityLoadError("Public snapshot", snap.reason));
        console.error("Error loading public snapshot observability:", snap.reason);
      }

      if (health.status === "fulfilled") {
        setSnapshotHealth(health.value.exists() ? { id: health.value.id, ...health.value.data() } : null);
      } else {
        issues.push(describeObservabilityLoadError("Snapshot health", health.reason));
        console.error("Error loading snapshot health:", health.reason);
      }

      if (funnel.status === "fulfilled") {
        setBookingFunnelHealth(funnel.value.exists() ? { id: funnel.value.id, ...funnel.value.data() } : null);
      } else {
        issues.push(describeObservabilityLoadError("Booking funnel health", funnel.reason));
        console.error("Error loading booking funnel health:", funnel.reason);
      }

      if (rebuildEventsSnap.status === "fulfilled") {
        setSnapshotRebuildEvents(rebuildEventsSnap.value.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      } else {
        issues.push(describeObservabilityLoadError("História rebuildov", rebuildEventsSnap.reason));
        console.error("Error loading snapshot rebuild events:", rebuildEventsSnap.reason);
      }

      if (opsAlertsSnap.status === "fulfilled") {
        setOpsAlerts(opsAlertsSnap.value.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      } else {
        issues.push(describeObservabilityLoadError("Alert feed", opsAlertsSnap.reason));
        console.error("Error loading ops alerts:", opsAlertsSnap.reason);
      }

      setObservabilityLoadIssues(issues);
    } finally {
      setObservabilityRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadObservability();
  }, [loadObservability]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const previousAvatarUrl = profile.avatar_url ?? null;
    const nextAvatarUrl = profileForm.avatar_url || null;
    try {
      await updateDoc(doc(db, "profiles", profile.id), {
        full_name: profileForm.full_name,
        phone: profileForm.phone || null,
        avatar_url: nextAvatarUrl,
        updated_at: new Date().toISOString()
      });
      if (previousAvatarUrl && previousAvatarUrl !== nextAvatarUrl) {
        try {
          await deleteObject(ref(storage, previousAvatarUrl));
        } catch (error) {
          console.warn("SettingsPage: failed to delete previous avatar", error);
        }
      }
      await refreshProfile();
      toast.success("Profil aktualizovaný");
    } catch (err) {
      maybeWarnBlockedRequest(err);
      console.error("SettingsPage: profile save error", err);
      toast.error(friendlyError(err, "Chyba pri ukladaní profilu"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateProfileImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    void (async () => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setCropImageSrc(dataUrl);
      } catch {
        toast.error("Fotku sa nepodarilo načítať");
      }
    })();
  };

  const handleAvatarCropConfirm = async (croppedBlob: Blob) => {
    if (!profile) return;
    if (uploadingAvatar) return;

    const validationError = validateProfileImageBlob(croppedBlob);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressedBlob = await compressProfileImage(croppedBlob);
      const compressedValidationError = validateProfileImageBlob(compressedBlob);
      if (compressedValidationError) {
        toast.error(compressedValidationError);
        return;
      }
      const fileName = `profiles/${profile.id}/${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, compressedBlob, {
        contentType: compressedBlob.type || "image/jpeg",
        cacheControl: "public,max-age=31536000,immutable",
      });
      const url = await getDownloadURL(storageRef);
      setProfileForm((prev) => ({ ...prev, avatar_url: url }));
      setCropImageSrc(null);
      // Auto-save avatar immediately so it doesn't disappear on navigation
      await setDoc(doc(db, "profiles", profile.id), {
        avatar_url: url,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      await refreshProfile();
      toast.success("Profilová fotka uložená");
    } catch (err) {
      if (isBlockedByClientError(err)) {
        warnBlockedByClientOnce((message) => toast.warning(message));
      }
      console.error("SettingsPage: avatar upload error", err);
      toast.error(mapAvatarUploadError(err));
    } finally {
      setUploadingAvatar(false);
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
      maybeWarnBlockedRequest(err);
      console.error("Business save error:", err);
      toast.error(friendlyError(err, "Chyba pri ukladaní"));
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
      maybeWarnBlockedRequest(err);
      console.error("SMTP save error:", err);
      toast.error(friendlyError(err, "Chyba pri ukladaní SMTP"));
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
      maybeWarnBlockedRequest(err);
      console.error("Booking settings save error:", err);
      toast.error(friendlyError(err, "Chyba pri ukladaní nastavení booking"));
    } finally {
      setSaving(false);
    }
  };

  const rebuildSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const fn = httpsCallable<any, any>(functions, "rebuildPublicSnapshot");
      const { data } = await fn({ business_id: businessId });
      if (data?.success) {
        toast.success("Snapshot rebuild spustený");
        await loadObservability();
      } else {
        toast.error("Snapshot rebuild zlyhal");
      }
    } catch (err) {
      maybeWarnBlockedRequest(err);
      console.error("Snapshot rebuild error:", err);
      toast.error(friendlyError(err, "Snapshot rebuild zlyhal"));
    } finally {
      setSnapshotLoading(false);
    }
  };

  const syncObservabilityAlertFeed = async () => {
    setSyncingObservabilityAlerts(true);
    try {
      const fn = httpsCallable<any, any>(functions, "syncObservabilityAlerts");
      const { data } = await fn({ business_id: businessId });
      if (data?.success) {
        toast.success(
          `Alerty synchronizované (${data.active_alerts ?? 0} aktívnych, ${data.resolved_alerts ?? 0} vyriešených)`,
        );
        await loadObservability();
      } else {
        toast.error("Synchronizácia alertov zlyhala");
      }
    } catch (err) {
      maybeWarnBlockedRequest(err);
      console.error("Observability alert sync error:", err);
      toast.error(friendlyError(err, "Synchronizácia alertov zlyhala"));
    } finally {
      setSyncingObservabilityAlerts(false);
    }
  };

  const applyLicense = async () => {
    if (!licenseKey.trim()) {
      setLicenseMessage("Zadajte licenčný kľúč");
      setLicenseState("error");
      return;
    }
    setLicenseState("checking");
    setLicenseMessage(null);
    try {
      const licSnap = await getDoc(doc(db, "licenses", licenseKey.trim()));
      if (!licSnap.exists()) {
        setLicenseState("error");
        setLicenseMessage("Neplatný licenčný kľúč");
        return;
      }
      const lic = licSnap.data() as any;
      const expires = lic.expires_at instanceof Timestamp ? lic.expires_at.toDate() : null;
      if (expires && expires.getTime() < Date.now()) {
        setLicenseState("error");
        setLicenseMessage("Licencia expirovala");
        return;
      }

      await updateDoc(doc(db, "businesses", businessId), {
        license_key: licenseKey.trim(),
        license_unlimited: !!lic.unlimited,
        license_max_seats: lic.max_seats ?? 5,
        license_assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      setLicenseState("ok");
      setLicenseMessage(
        lic.unlimited
          ? "Licencia aktivovaná: neobmedzené"
          : `Licencia aktivovaná: limit ${lic.max_seats ?? 5}`
      );
      toast.success("Licencia aktivovaná");
    } catch (err) {
      maybeWarnBlockedRequest(err);
      console.error("License apply error:", err);
      setLicenseState("error");
      setLicenseMessage(friendlyError(err, "Chyba pri aktivácii licencie"));
    }
  };

  const initials = (profileForm.full_name || profile?.full_name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const funnelCounters =
    bookingFunnelHealth?.counters && typeof bookingFunnelHealth.counters === "object"
      ? Object.entries(bookingFunnelHealth.counters as Record<string, unknown>)
          .filter(([, value]) => typeof value === "number")
          .sort((a, b) => Number(b[1]) - Number(a[1]))
      : [];
  const observabilityAlerts = useMemo(
    () => buildObservabilityAlerts(snapshotInfo, snapshotHealth, bookingFunnelHealth),
    [bookingFunnelHealth, snapshotHealth, snapshotInfo],
  );
  const activeOpsAlerts = useMemo(
    () => opsAlerts.filter((alert) => alert.status === "active"),
    [opsAlerts],
  );
  const resolvedOpsAlerts = useMemo(
    () => opsAlerts.filter((alert) => alert.status === "resolved"),
    [opsAlerts],
  );
  const observabilityTone = useMemo(
    () => getObservabilityHealthTone(observabilityAlerts),
    [observabilityAlerts],
  );
  const observabilityLabel = getObservabilityHealthLabel(observabilityTone);
  const latestSnapshotTimestamp =
    snapshotHealth?.last_success_at ?? snapshotHealth?.updated_at ?? snapshotInfo?.updated_at ?? null;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <AdminPageHeader
        title="Nastavenia"
        description="Správa firmy, profilu, bookingu a systémových nastavení na jednom mieste."
      />

      <Tabs defaultValue={isOwnerOrAdmin ? "general" : "profile"} className="w-full">
        <TabsList className={`mb-6 grid h-auto w-full rounded-2xl border border-primary/10 bg-card/35 p-1.5 shadow-sm shadow-primary/5 backdrop-blur-xl ${isOwnerOrAdmin ? "grid-cols-2 md:grid-cols-7" : "grid-cols-1"}`}>
          {isOwnerOrAdmin && (
            <>
              <TabsTrigger value="general" className="rounded-xl py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Všeobecné</TabsTrigger>
              <TabsTrigger value="booking" className="rounded-xl py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Booking</TabsTrigger>
              <TabsTrigger value="hours" className="rounded-xl py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Otváracie hodiny</TabsTrigger>
              <TabsTrigger value="smtp" className="rounded-xl py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">SMTP e-mail</TabsTrigger>
              <TabsTrigger value="snapshot" className="rounded-xl py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Snapshot</TabsTrigger>
              <TabsTrigger value="license" className="rounded-xl py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Licencia</TabsTrigger>
            </>
          )}
          <TabsTrigger value="profile" className="rounded-xl py-2.5 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground transition-all">Profil</TabsTrigger>
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

        <TabsContent value="snapshot" className="space-y-6 mt-0">
          <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-primary/5 bg-muted/20 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-primary" />
                    Public Snapshot
                  </CardTitle>
                  <CardDescription>Statický výrez dát pre booking frontend</CardDescription>
                </div>
                <Button
                  onClick={rebuildSnapshot}
                  disabled={snapshotLoading || !isOwner}
                  className="bg-gold hover:bg-gold/90 text-gold-foreground shadow-lg shadow-gold/20 px-6"
                >
                  {snapshotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Rebuild
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5 text-sm text-muted-foreground">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className={`rounded-2xl border p-4 ${getObservabilityToneClasses(observabilityTone)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-widest">Prevádzkový stav</div>
                      <div className="mt-1 text-lg font-semibold text-foreground">{observabilityLabel}</div>
                    </div>
                    <Badge variant="outline" className={getObservabilityToneClasses(observabilityTone)}>
                      {observabilityAlerts.length === 0 ? "0 alertov" : `${observabilityAlerts.length} alertov`}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs">
                    {observabilityAlerts.length === 0
                      ? "Snapshot aj booking funnel vyzerajú zdravo."
                      : "Nižšie sú presné warning/error signály, ktoré treba sledovať."}
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Snapshot pipeline</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{snapshotHealth?.status ?? snapshotInfo?.status ?? "—"}</div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>
                      Posledný úspech:{" "}
                      <span className="font-semibold text-foreground">
                        {latestSnapshotTimestamp ? new Date(latestSnapshotTimestamp).toLocaleString() : "—"}
                      </span>
                    </div>
                    <div>
                      Trigger source:{" "}
                      <span className="font-semibold text-foreground">{snapshotHealth?.last_trigger_source ?? "—"}</span>
                    </div>
                    <div>
                      Duration:{" "}
                      <span className="font-semibold text-foreground">
                        {typeof snapshotHealth?.duration_ms === "number" ? `${snapshotHealth.duration_ms} ms` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Booking funnel</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {bookingFunnelHealth?.last_event_name ?? "Zatiaľ bez eventov"}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>
                      Posledný event:{" "}
                      <span className="font-semibold text-foreground">
                        {bookingFunnelHealth?.last_event_at
                          ? new Date(bookingFunnelHealth.last_event_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    <div>
                      Celkom eventov:{" "}
                      <span className="font-semibold text-foreground">{bookingFunnelHealth?.total_events ?? 0}</span>
                    </div>
                    <div>
                      Snapshot revision:{" "}
                      <span className="font-semibold text-foreground">{snapshotInfo?.revision ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {observabilityLoadIssues.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  <div className="font-semibold text-foreground">Observability dáta sú načítané len čiastočne</div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {observabilityLoadIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Alerty</div>
                    <div className="text-sm font-semibold text-foreground">Automatické vyhodnotenie zdravia systému</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={syncObservabilityAlertFeed}
                      disabled={syncingObservabilityAlerts || !isOwnerOrAdmin}
                    >
                      {syncingObservabilityAlerts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Synchronizovať alerty
                    </Button>
                    <Button variant="outline" onClick={() => void loadObservability()} disabled={observabilityRefreshing}>
                      {observabilityRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Obnoviť dáta
                    </Button>
                  </div>
                </div>
                {observabilityAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {observabilityAlerts.map((alert) => (
                      <div
                        key={`${alert.severity}-${alert.title}`}
                        className="rounded-xl border border-primary/10 bg-card/40 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={getAlertBadgeClasses(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <div className="font-semibold text-foreground">{alert.title}</div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{alert.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    Žiadne warningy ani chyby. Snapshot a booking funnel vyzerajú zdravo.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-primary/10 bg-background/40 p-4" data-testid="ops-alert-feed">
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Server-side alert feed</div>
                  <div className="text-sm font-semibold text-foreground">
                    Kanonické alerty synchronizované z `ops_health` a public snapshotu
                  </div>
                </div>
                {opsAlerts.length > 0 ? (
                  <div className="space-y-4">
                    {activeOpsAlerts.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Aktívne</div>
                        {activeOpsAlerts.map((alert) => (
                          <div key={alert.id} className="rounded-xl border border-primary/10 bg-card/40 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={getAlertBadgeClasses(alert.severity ?? "warning")}>
                                {alert.severity ?? "warning"}
                              </Badge>
                              <Badge variant="outline" className={getPersistedObservabilityStatusClasses("active")}>
                                {getPersistedObservabilityStatusLabel("active")}
                              </Badge>
                              <div className="font-semibold text-foreground">{alert.title ?? alert.code ?? "Alert"}</div>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{alert.description ?? "Bez popisu."}</p>
                            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-3">
                              <div>
                                Zdroj: <span className="font-semibold text-foreground">{alert.source_kind ?? "—"}</span>
                              </div>
                              <div>
                                Prvý výskyt:{" "}
                                <span className="font-semibold text-foreground">
                                  {alert.first_detected_at ? new Date(alert.first_detected_at).toLocaleString() : "—"}
                                </span>
                              </div>
                              <div>
                                Naposledy potvrdené:{" "}
                                <span className="font-semibold text-foreground">
                                  {alert.last_detected_at ? new Date(alert.last_detected_at).toLocaleString() : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        Aktívne server-side alerty momentálne neexistujú.
                      </div>
                    )}

                    {resolvedOpsAlerts.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Nedávno vyriešené</div>
                        {resolvedOpsAlerts.slice(0, 4).map((alert) => (
                          <div key={alert.id} className="rounded-xl border border-primary/5 bg-card/30 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={getAlertBadgeClasses(alert.severity ?? "warning")}>
                                {alert.severity ?? "warning"}
                              </Badge>
                              <Badge variant="outline" className={getPersistedObservabilityStatusClasses("resolved")}>
                                {getPersistedObservabilityStatusLabel("resolved")}
                              </Badge>
                              <div className="font-semibold text-foreground">{alert.title ?? alert.code ?? "Alert"}</div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Vyriešené:{" "}
                              <span className="font-semibold text-foreground">
                                {alert.resolved_at ? new Date(alert.resolved_at).toLocaleString() : "—"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-primary/10 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                    Server-side alert feed zatiaľ neobsahuje žiadne záznamy pre túto firmu.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Snapshot metriky</div>
                    <div className="text-sm font-semibold text-foreground">Aktuálny výrez dát pre booking frontend</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest">Status</div>
                      <div className="font-semibold text-foreground">{snapshotInfo?.status ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest">Služby</div>
                      <div className="font-semibold text-foreground">{snapshotHealth?.service_count ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest">Podkategórie</div>
                      <div className="font-semibold text-foreground">{snapshotHealth?.subcategory_count ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest">Zamestnanci</div>
                      <div className="font-semibold text-foreground">{snapshotHealth?.employee_count ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest">Business hours</div>
                      <div className="font-semibold text-foreground">{snapshotHealth?.business_hours_count ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest">Výnimky</div>
                      <div className="font-semibold text-foreground">{snapshotHealth?.date_override_count ?? "—"}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Snapshot sa rebuilduje automaticky pri zmenách v business, službách, podkategóriách, zamestnancoch a hodinách.
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Booking funnel</div>
                    <div className="text-sm font-semibold text-foreground">Posledné počítadlá vo verejnom booking flow</div>
                  </div>
                  {funnelCounters.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {funnelCounters.slice(0, 6).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-primary/5 bg-card/40 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{key}</div>
                          <div className="text-sm font-semibold text-foreground">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Booking funnel eventy sa začnú zobrazovať po prvých interakciách zákazníkov vo verejnom bookingu.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/10 bg-background/40 p-4" data-testid="snapshot-rebuild-events">
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">História rebuildov</div>
                  <div className="text-sm font-semibold text-foreground">Posledné eventy zo `snapshot_rebuild_events`</div>
                </div>
                {snapshotRebuildEvents.length > 0 ? (
                  <div className="space-y-3">
                    {snapshotRebuildEvents.map((event) => (
                      <div key={event.id} className="rounded-xl border border-primary/5 bg-card/40 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getObservabilityToneClasses(
                              event.status === "failed" ? "error" : "healthy",
                            )}
                          >
                            {event.status ?? "unknown"}
                          </Badge>
                          <div className="font-semibold text-foreground">
                            {event.created_at ? new Date(event.created_at).toLocaleString() : "Neznámy čas"}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                          <div>
                            Source: <span className="font-semibold text-foreground">{event.last_trigger_source ?? "—"}</span>
                          </div>
                          <div>
                            Duration:{" "}
                            <span className="font-semibold text-foreground">
                              {typeof event.duration_ms === "number" ? `${event.duration_ms} ms` : "—"}
                            </span>
                          </div>
                          <div>
                            Služby: <span className="font-semibold text-foreground">{event.service_count ?? "—"}</span>
                          </div>
                          <div>
                            Podkategórie:{" "}
                            <span className="font-semibold text-foreground">{event.subcategory_count ?? "—"}</span>
                          </div>
                        </div>
                        {event.error ? <p className="mt-2 text-xs text-red-500">{event.error}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Zatiaľ nie sú dostupné žiadne rebuild eventy pre túto firmu.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license" className="space-y-6 mt-0">
          <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-primary/5 bg-muted/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Licenčný kľúč
              </CardTitle>
              <CardDescription>Aktivujte “full” režim pre max 5 licencovaných pobočiek (unlimited kľúč = bez limitov)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Kľúč</Label>
                <Input
                  className="bg-background/50 border-primary/10 focus:ring-primary/20"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Zadajte licenčný kľúč"
                />
              </div>
              {licenseMessage && (
                <div className={`text-sm ${licenseState === "error" ? "text-red-500" : "text-emerald-500"}`}>
                  {licenseMessage}
                </div>
              )}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={applyLicense}
                  disabled={licenseState === "checking" || !isOwner}
                  className="bg-gold hover:bg-gold/90 text-gold-foreground shadow-lg shadow-gold/20 px-8 transition-all"
                >
                  {licenseState === "checking" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Aktivovať
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
              <div className="flex items-center gap-5 rounded-2xl border border-primary/10 bg-background/40 p-4">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-2 border-primary/20 shadow-lg">
                    {profileForm.avatar_url && <AvatarImage src={profileForm.avatar_url} alt="Profilová fotka" />}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gold text-gold-foreground shadow flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Profilová fotka</p>
                  <p className="text-xs text-muted-foreground">Kliknite na ikonu fotoaparátu, orežte fotku a uložte profil.</p>
                  {profileForm.avatar_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProfileForm((f) => ({ ...f, avatar_url: null }))}
                      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Odstrániť fotku
                    </Button>
                  )}
                </div>
              </div>

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
      {cropImageSrc && (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onConfirm={handleAvatarCropConfirm}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
}

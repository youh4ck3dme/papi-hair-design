import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, addDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Check, Building2, Clock, Briefcase, Users, Settings2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { z } from "zod";

const DAYS = [
  { key: "monday", label: "Pondelok" },
  { key: "tuesday", label: "Utorok" },
  { key: "wednesday", label: "Streda" },
  { key: "thursday", label: "Štvrtok" },
  { key: "friday", label: "Piatok" },
  { key: "saturday", label: "Sobota" },
  { key: "sunday", label: "Nedeľa" },
];

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

interface OpeningDay {
  open: boolean;
  start: string;
  end: string;
}

type OpeningHours = Record<DayKey, OpeningDay>;

const DEFAULT_HOURS: OpeningHours = {
  monday: { open: true, start: "09:00", end: "18:00" },
  tuesday: { open: true, start: "09:00", end: "18:00" },
  wednesday: { open: true, start: "09:00", end: "18:00" },
  thursday: { open: true, start: "09:00", end: "18:00" },
  friday: { open: true, start: "09:00", end: "18:00" },
  saturday: { open: true, start: "09:00", end: "14:00" },
  sunday: { open: false, start: "09:00", end: "18:00" },
};

interface ServiceEntry {
  id?: string; // existing DB id for upsert
  name_sk: string;
  duration_minutes: number;
  buffer_minutes: number;
  price: string;
}

interface EmployeeEntry {
  id?: string; // existing DB id for upsert
  display_name: string;
  email: string;
}

const STEPS = [
  { num: 1, title: "Základné údaje", icon: Building2 },
  { num: 2, title: "Otváracie hodiny", icon: Clock },
  { num: 3, title: "Služby", icon: Briefcase },
  { num: 4, title: "Zamestnanci", icon: Users },
  { num: 5, title: "Pravidlá", icon: Settings2 },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { businessId } = useBusiness();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Step 1: Business info
  const [bizForm, setBizForm] = useState({
    name: "", address: "", phone: "", email: "", timezone: "Europe/Bratislava",
  });

  // Step 2: Opening hours
  const [hours, setHours] = useState<OpeningHours>(DEFAULT_HOURS);

  // Step 3: Services
  const [servicesList, setServicesList] = useState<ServiceEntry[]>([
    { name_sk: "", duration_minutes: 30, buffer_minutes: 0, price: "" },
  ]);

  // Step 4: Employees
  const [employeesList, setEmployeesList] = useState<EmployeeEntry[]>([
    { display_name: "", email: "" },
  ]);

  // Step 5: Booking rules
  const [rules, setRules] = useState({
    lead_time_minutes: 60, max_days_ahead: 60, cancellation_hours: 24,
  });

  // Load existing data
  useEffect(() => {
    const loadExisting = async () => {
      setLoadingExisting(true);

      // Load existing business data
      const bizSnap = await getDoc(doc(db, "businesses", businessId));

      if (bizSnap.exists()) {
        const biz = bizSnap.data();
        setBizForm({
          name: biz.name || "",
          address: biz.address || "",
          phone: biz.phone || "",
          email: biz.email || "",
          timezone: biz.timezone || "Europe/Bratislava",
        });
        if (biz.opening_hours && typeof biz.opening_hours === "object") {
          setHours({ ...DEFAULT_HOURS, ...(biz.opening_hours as any) });
        }
        setRules({
          lead_time_minutes: biz.lead_time_minutes ?? 60,
          max_days_ahead: biz.max_days_ahead ?? 60,
          cancellation_hours: biz.cancellation_hours ?? 24,
        });
      }

      // Load existing services
      const svcsSnap = await getDocs(query(
        collection(db, "services"),
        where("business_id", "==", businessId),
        where("is_active", "==", true)
      ));
      if (!svcsSnap.empty) {
        setServicesList(svcsSnap.docs.map((d) => {
          const s = d.data();
          return {
            id: d.id,
            name_sk: s.name_sk,
            duration_minutes: s.duration_minutes,
            buffer_minutes: s.buffer_minutes,
            price: s.price?.toString() ?? "",
          };
        }));
      }

      // Load existing employees
      const empsSnap = await getDocs(query(
        collection(db, "employees"),
        where("business_id", "==", businessId),
        where("is_active", "==", true)
      ));
      if (!empsSnap.empty) {
        setEmployeesList(empsSnap.docs.map((d) => {
          const e = d.data();
          return {
            id: d.id,
            display_name: e.display_name,
            email: e.email ?? "",
          };
        }));
      }

      // Check which steps are already completed
      const answersSnap = await getDocs(query(
        collection(db, "onboarding_answers"),
        where("business_id", "==", businessId)
      ));

      const completed = answersSnap.docs.map((d) => d.data().step as number);
      // Start at first incomplete step
      const firstIncomplete = [1, 2, 3, 4, 5].find((s) => !completed.includes(s)) ?? 1;
      setStep(firstIncomplete);

      setLoadingExisting(false);
    };

    loadExisting();
  }, [businessId]);

  const saveStep = async (stepNum: number, data: any) => {
    // Use setDoc with merge to upsert (Firestore doesn't have built-in upsert on compound keys)
    const stepDocId = `${businessId}_step${stepNum}`;
    await setDoc(doc(db, "onboarding_answers", stepDocId), {
      business_id: businessId,
      step: stepNum,
      data,
    }, { merge: true });
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        if (!bizForm.name.trim()) { toast.error("Zadajte názov firmy"); setSaving(false); return; }
        await updateDoc(doc(db, "businesses", businessId), {
          name: bizForm.name.trim(),
          address: bizForm.address.trim() || null,
          phone: bizForm.phone.trim() || null,
          email: bizForm.email.trim() || null,
          timezone: bizForm.timezone,
        });
        await saveStep(1, bizForm);
      } else if (step === 2) {
        await updateDoc(doc(db, "businesses", businessId), {
          opening_hours: JSON.parse(JSON.stringify(hours)),
        });
        await saveStep(2, JSON.parse(JSON.stringify(hours)));
      } else if (step === 3) {
        const validServices = servicesList.filter((s) => s.name_sk.trim());
        if (validServices.length === 0) { toast.error("Pridajte aspoň jednu službu"); setSaving(false); return; }

        // Get existing services for this business
        const existingSnap = await getDocs(query(
          collection(db, "services"), where("business_id", "==", businessId)
        ));
        const existingIds = existingSnap.docs.map((d) => d.id);

        // IDs that remain in the wizard form
        const keepIds = new Set(validServices.filter((s) => s.id).map((s) => s.id!));

        // Deactivate removed services (don't delete — FK safety)
        const toDeactivate = existingIds.filter((id) => !keepIds.has(id));
        for (const id of toDeactivate) {
          await updateDoc(doc(db, "services", id), { is_active: false });
        }

        // Upsert remaining + new services
        for (const svc of validServices) {
          const row = {
            business_id: businessId,
            name_sk: svc.name_sk.trim(),
            duration_minutes: Math.max(5, svc.duration_minutes),
            buffer_minutes: Math.max(0, svc.buffer_minutes),
            price: svc.price ? parseFloat(svc.price) : null,
            is_active: true,
          };
          if (svc.id) {
            await updateDoc(doc(db, "services", svc.id), row);
          } else {
            await addDoc(collection(db, "services"), row);
          }
        }
        await saveStep(3, validServices);
      } else if (step === 4) {
        const validEmps = employeesList.filter((e) => e.display_name.trim());
        if (validEmps.length === 0) { toast.error("Pridajte aspoň jedného zamestnanca"); setSaving(false); return; }

        // Get existing employees
        const existingSnap = await getDocs(query(
          collection(db, "employees"), where("business_id", "==", businessId)
        ));
        const existingIds = existingSnap.docs.map((d) => d.id);

        // IDs that remain in the wizard form
        const keepIds = new Set(validEmps.filter((e) => e.id).map((e) => e.id!));

        // Deactivate removed employees (don't delete — FK safety)
        const toDeactivate = existingIds.filter((id) => !keepIds.has(id));
        for (const id of toDeactivate) {
          await updateDoc(doc(db, "employees", id), { is_active: false });
        }

        // Upsert remaining + new employees
        for (const emp of validEmps) {
          const row = {
            business_id: businessId,
            display_name: emp.display_name.trim(),
            email: emp.email.trim() || null,
            is_active: true,
          };
          if (emp.id) {
            await updateDoc(doc(db, "employees", emp.id), row);
          } else {
            await addDoc(collection(db, "employees"), row);
          }
        }
        await saveStep(4, validEmps);
      } else if (step === 5) {
        await updateDoc(doc(db, "businesses", businessId), {
          lead_time_minutes: Math.max(0, rules.lead_time_minutes),
          max_days_ahead: Math.max(1, rules.max_days_ahead),
          cancellation_hours: Math.max(0, rules.cancellation_hours),
          onboarding_completed: true,
        });
        await saveStep(5, rules);
        toast.success("Nastavenie dokončené! 🎉");
        onComplete();
        setSaving(false);
        return;
      }

      setStep((s) => s + 1);
    } catch {
      toast.error("Chyba pri ukladaní");
    }
    setSaving(false);
  };

  if (loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <LogoIcon size="sm" />
          <span className="font-semibold text-foreground">Nastavenie salónu</span>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-6 w-full">
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1 rounded-full transition-colors ${step >= s.num ? "bg-primary" : "bg-border"
                }`} />
              <div className="flex items-center gap-1">
                <s.icon className={`w-3 h-3 ${step >= s.num ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs hidden sm:inline ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 flex-1 w-full">
        <Card className="border-border">
          <CardContent className="p-6">
            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Základné údaje</h2>
                  <p className="text-sm text-muted-foreground mt-1">Informácie o vašom salóne</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Názov firmy *</Label>
                    <Input
                      value={bizForm.name}
                      onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Salon Studio"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Adresa</Label>
                    <Input
                      value={bizForm.address}
                      onChange={(e) => setBizForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Hlavná 15, Bratislava"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Telefón</Label>
                      <Input
                        value={bizForm.phone}
                        onChange={(e) => setBizForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+421 900 123 456"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={bizForm.email}
                        onChange={(e) => setBizForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="info@salon.sk"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Opening Hours */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Otváracie hodiny</h2>
                  <p className="text-sm text-muted-foreground mt-1">Nastavte hodiny pre každý deň v týždni</p>
                </div>
                <div className="space-y-2">
                  {DAYS.map(({ key, label }) => {
                    const day = hours[key as DayKey];
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <Checkbox
                          id={`oh-${key}`}
                          checked={day.open}
                          onCheckedChange={(v) =>
                            setHours((h) => ({ ...h, [key]: { ...h[key as DayKey], open: !!v } }))
                          }
                        />
                        <label htmlFor={`oh-${key}`} className="text-sm w-20 text-foreground font-medium">{label}</label>
                        {day.open && (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              type="time"
                              value={day.start}
                              onChange={(e) =>
                                setHours((h) => ({ ...h, [key]: { ...h[key as DayKey], start: e.target.value } }))
                              }
                              className="h-8 text-xs"
                            />
                            <span className="text-muted-foreground text-xs">–</span>
                            <Input
                              type="time"
                              value={day.end}
                              onChange={(e) =>
                                setHours((h) => ({ ...h, [key]: { ...h[key as DayKey], end: e.target.value } }))
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                        {!day.open && <span className="text-xs text-muted-foreground">Zatvorené</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Services */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Služby</h2>
                  <p className="text-sm text-muted-foreground mt-1">Pridajte služby, ktoré ponúkate</p>
                </div>
                <div className="space-y-3">
                  {servicesList.map((svc, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={svc.name_sk}
                          onChange={(e) => {
                            const copy = [...servicesList];
                            copy[i] = { ...copy[i], name_sk: e.target.value };
                            setServicesList(copy);
                          }}
                          placeholder="Názov služby"
                          className="flex-1"
                        />
                        {servicesList.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setServicesList((s) => s.filter((_, j) => j !== i))}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Trvanie (min)</Label>
                          <Input
                            type="number"
                            min={5}
                            value={svc.duration_minutes}
                            onChange={(e) => {
                              const copy = [...servicesList];
                              copy[i] = { ...copy[i], duration_minutes: +e.target.value };
                              setServicesList(copy);
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Buffer (min)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={svc.buffer_minutes}
                            onChange={(e) => {
                              const copy = [...servicesList];
                              copy[i] = { ...copy[i], buffer_minutes: +e.target.value };
                              setServicesList(copy);
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cena (€)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={svc.price}
                            onChange={(e) => {
                              const copy = [...servicesList];
                              copy[i] = { ...copy[i], price: e.target.value };
                              setServicesList(copy);
                            }}
                            placeholder="—"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setServicesList((s) => [...s, { name_sk: "", duration_minutes: 30, buffer_minutes: 0, price: "" }])}
                  >
                    + Pridať službu
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Employees */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Zamestnanci</h2>
                  <p className="text-sm text-muted-foreground mt-1">Pridajte členov tímu</p>
                </div>
                <div className="space-y-3">
                  {employeesList.map((emp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={emp.display_name}
                        onChange={(e) => {
                          const copy = [...employeesList];
                          copy[i] = { ...copy[i], display_name: e.target.value };
                          setEmployeesList(copy);
                        }}
                        placeholder="Meno a priezvisko"
                        className="flex-1"
                      />
                      <Input
                        value={emp.email}
                        onChange={(e) => {
                          const copy = [...employeesList];
                          copy[i] = { ...copy[i], email: e.target.value };
                          setEmployeesList(copy);
                        }}
                        placeholder="Email (voliteľný)"
                        className="flex-1"
                      />
                      {employeesList.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setEmployeesList((s) => s.filter((_, j) => j !== i))}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmployeesList((s) => [...s, { display_name: "", email: "" }])}
                  >
                    + Pridať zamestnanca
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pracovné hodiny pre zamestnancov môžete nastaviť neskôr v časti Zamestnanci.
                </p>
              </div>
            )}

            {/* Step 5: Booking Rules */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Pravidlá rezervácií</h2>
                  <p className="text-sm text-muted-foreground mt-1">Nastavte obmedzenia pre online rezervácie</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Minimálny čas vopred (minúty)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={rules.lead_time_minutes}
                      onChange={(e) => setRules((r) => ({ ...r, lead_time_minutes: +e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Zákazník nemôže rezervovať termín skôr ako {rules.lead_time_minutes} min pred začiatkom.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maximálny počet dní dopredu</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rules.max_days_ahead}
                      onChange={(e) => setRules((r) => ({ ...r, max_days_ahead: +e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Zákazník môže rezervovať max. {rules.max_days_ahead} dní vopred.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Storno lehota (hodiny)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={rules.cancellation_hours}
                      onChange={(e) => setRules((r) => ({ ...r, cancellation_hours: +e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Zákazník môže zrušiť rezerváciu najneskôr {rules.cancellation_hours} hodín pred termínom.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Späť
                </Button>
              )}
              <div className="flex-1" />
              <Button onClick={handleNext} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {step === 5 ? (
                  <>
                    <Check className="w-4 h-4 mr-1" /> Dokončiť
                  </>
                ) : (
                  <>
                    Ďalej <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

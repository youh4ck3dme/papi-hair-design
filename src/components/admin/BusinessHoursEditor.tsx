import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, ExternalLink } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Pondelok" },
  { key: "tuesday", label: "Utorok" },
  { key: "wednesday", label: "Streda" },
  { key: "thursday", label: "Štvrtok" },
  { key: "friday", label: "Piatok" },
  { key: "saturday", label: "Sobota" },
  { key: "sunday", label: "Nedeľa" },
];

interface HourRow {
  id?: string;
  day_of_week: string;
  mode: "open" | "closed" | "on_request";
  start_time: string;
  end_time: string;
  sort_order: number;
}

interface OverrideRow {
  id?: string;
  override_date: string;
  mode: "open" | "closed" | "on_request";
  start_time: string;
  end_time: string;
  label: string;
}

interface LinkRow {
  id?: string;
  label: string;
  url: string;
  sort_order: number;
}

export function BusinessHoursEditor() {
  const { businessId } = useBusiness();
  const [hours, setHours] = useState<HourRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [hSnap, oSnap, lSnap] = await Promise.all([
        getDocs(query(collection(db, "business_hours"), where("business_id", "==", businessId), orderBy("sort_order"))),
        getDocs(query(collection(db, "business_date_overrides"), where("business_id", "==", businessId), orderBy("override_date"))),
        getDocs(query(collection(db, "business_quick_links"), where("business_id", "==", businessId), orderBy("sort_order"))),
      ]);

      if (!hSnap.empty) {
        setHours(hSnap.docs.map((d) => {
          const h = d.data();
          return {
            id: d.id,
            day_of_week: h.day_of_week,
            mode: h.mode,
            start_time: h.start_time?.slice(0, 5) ?? "09:00",
            end_time: h.end_time?.slice(0, 5) ?? "17:00",
            sort_order: h.sort_order,
          };
        }));
      } else {
        // Initialize with defaults
        setHours(DAYS.map((d, i) => ({
          day_of_week: d.key,
          mode: i < 5 ? "open" : i === 5 ? "on_request" : "closed",
          start_time: "09:00",
          end_time: "17:00",
          sort_order: i,
        })));
      }

      setOverrides(oSnap.docs.map((d) => {
        const o = d.data();
        return {
          id: d.id,
          override_date: o.override_date,
          mode: o.mode,
          start_time: o.start_time?.slice(0, 5) ?? "09:00",
          end_time: o.end_time?.slice(0, 5) ?? "17:00",
          label: o.label ?? "",
        };
      }));

      setLinks(lSnap.docs.map((d) => {
        const l = d.data();
        return {
          id: d.id,
          label: l.label,
          url: l.url,
          sort_order: l.sort_order,
        };
      }));

      setLoading(false);
    };
    load();
  }, [businessId]);

  const updateHour = (idx: number, field: string, value: string) => {
    setHours((h) => h.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);

      // Helper: queue deletes for all docs in a collection matching business_id
      const queueDeletes = async (collectionName: string) => {
        const snap = await getDocs(query(collection(db, collectionName), where("business_id", "==", businessId)));
        snap.docs.forEach((d) => batch.delete(doc(db, collectionName, d.id)));
      };

      // Queue deletes
      await queueDeletes("business_hours");
      await queueDeletes("business_date_overrides");
      await queueDeletes("business_quick_links");

      // Queue inserts using auto-generated doc refs
      for (const h of hours) {
        batch.set(doc(collection(db, "business_hours")), {
          business_id: businessId,
          day_of_week: h.day_of_week,
          mode: h.mode,
          start_time: h.start_time,
          end_time: h.end_time,
          sort_order: h.sort_order,
        });
      }

      for (const o of overrides) {
        batch.set(doc(collection(db, "business_date_overrides")), {
          business_id: businessId,
          override_date: o.override_date,
          mode: o.mode,
          start_time: o.mode !== "closed" ? o.start_time : null,
          end_time: o.mode !== "closed" ? o.end_time : null,
          label: o.label || null,
        });
      }

      for (const [i, l] of links.entries()) {
        batch.set(doc(collection(db, "business_quick_links")), {
          business_id: businessId,
          label: l.label,
          url: l.url,
          sort_order: i,
        });
      }

      await batch.commit();
      toast.success("Otváracie hodiny uložené");
    } catch (err: any) {
      toast.error(err.message ?? "Chyba pri ukladaní");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Weekly hours */}
      <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-primary/5 bg-muted/20">
          <CardTitle className="text-lg font-bold">Týždenné otváracie hodiny</CardTitle>
          <p className="text-sm text-muted-foreground">Nastavte si bežný pracovný čas pre každý deň v týždni.</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {hours.map((h, i) => (
            <div key={h.day_of_week} className="flex items-center gap-4 p-3 rounded-xl border border-primary/5 bg-background/40 hover:bg-primary/5 transition-colors group">
              <span className="w-28 text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                {DAYS.find((d) => d.key === h.day_of_week)?.label}
              </span>
              <div className="flex items-center gap-3 flex-1 lg:flex-none">
                <Select value={h.mode} onValueChange={(v) => updateHour(i, "mode", v)}>
                  <SelectTrigger className="w-40 bg-background/50 border-primary/10 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-background/95 border-primary/10">
                    <SelectItem value="open">Otvorené</SelectItem>
                    <SelectItem value="closed">Zatvorené</SelectItem>
                    <SelectItem value="on_request">Na požiadanie</SelectItem>
                  </SelectContent>
                </Select>
                {h.mode !== "closed" && (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                    <Input
                      type="time"
                      value={h.start_time}
                      onChange={(e) => updateHour(i, "start_time", e.target.value)}
                      className="w-32 bg-background/50 border-primary/10 focus:ring-primary/20"
                    />
                    <span className="text-muted-foreground font-medium">–</span>
                    <Input
                      type="time"
                      value={h.end_time}
                      onChange={(e) => updateHour(i, "end_time", e.target.value)}
                      className="w-32 bg-background/50 border-primary/10 focus:ring-primary/20"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Date overrides */}
      <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-primary/5 bg-muted/20 flex flex-row items-center justify-between py-4">
          <div className="space-y-0.5">
            <CardTitle className="text-lg font-bold">Výnimky</CardTitle>
            <p className="text-sm text-muted-foreground">Sviatky, dovolenky a špeciálne dni.</p>
          </div>
          <Button size="sm" variant="outline" className="border-gold text-gold hover:bg-gold hover:text-gold-foreground transition-all" onClick={() => setOverrides((o) => [...o, {
            override_date: new Date().toISOString().slice(0, 10),
            mode: "closed",
            start_time: "09:00",
            end_time: "17:00",
            label: "",
          }])}>
            <Plus className="w-4 h-4 mr-2" /> Pridať výnimku
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {overrides.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-primary/5 rounded-2xl bg-muted/20">
              <p className="text-sm text-muted-foreground italic">Žiadne aktívne výnimky</p>
            </div>
          )}
          {overrides.map((o, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-primary/10 bg-background/40 hover:border-gold/30 transition-all animate-in slide-in-from-left-4 duration-300">
              <Input
                type="date"
                value={o.override_date}
                onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, override_date: e.target.value } : x))}
                className="w-44 bg-background/50 border-primary/10 focus:ring-primary/20"
              />
              <Select
                value={o.mode}
                onValueChange={(v) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, mode: v as any } : x))}
              >
                <SelectTrigger className="w-40 bg-background/50 border-primary/10 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-background/95 border-primary/10">
                  <SelectItem value="open">Otvorené</SelectItem>
                  <SelectItem value="closed">Zatvorené</SelectItem>
                  <SelectItem value="on_request">Na požiadanie</SelectItem>
                </SelectContent>
              </Select>
              {o.mode !== "closed" && (
                <div className="flex items-center gap-2">
                  <Input type="time" value={o.start_time} onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, start_time: e.target.value } : x))} className="w-32 bg-background/50 border-primary/10 focus:ring-primary/20" />
                  <span className="text-muted-foreground">–</span>
                  <Input type="time" value={o.end_time} onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, end_time: e.target.value } : x))} className="w-32 bg-background/50 border-primary/10 focus:ring-primary/20" />
                </div>
              )}
              <Input
                value={o.label}
                onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                placeholder="Dôvod (napr. Sviatok)"
                className="flex-1 bg-background/50 border-primary/10 focus:ring-primary/20"
              />
              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setOverrides((ov) => ov.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card className="border-primary/10 bg-card/30 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-primary/5 bg-muted/20 flex flex-row items-center justify-between py-4">
          <div className="space-y-0.5">
            <CardTitle className="text-lg font-bold">Rýchle odkazy</CardTitle>
            <p className="text-sm text-muted-foreground">Užitočné externé linky pre váš tím.</p>
          </div>
          <Button size="sm" variant="outline" className="border-gold text-gold hover:bg-gold hover:text-gold-foreground transition-all" onClick={() => setLinks((l) => [...l, { label: "", url: "", sort_order: l.length }])}>
            <Plus className="w-4 h-4 mr-2" /> Pridať odkaz
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {links.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-primary/5 rounded-2xl bg-muted/20">
              <p className="text-sm text-muted-foreground italic">Žiadne odkazy</p>
            </div>
          )}
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-primary/10 bg-background/40 hover:border-gold/30 transition-all animate-in zoom-in-95 duration-300">
              <Input
                value={l.label}
                onChange={(e) => setLinks((ls) => ls.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                placeholder="Názov (napr. Cenník)"
                className="w-48 bg-background/50 border-primary/10 focus:ring-primary/20"
              />
              <div className="flex-1 flex items-center gap-2 group">
                <Input
                  value={l.url}
                  onChange={(e) => setLinks((ls) => ls.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                  placeholder="https://..."
                  className="flex-1 bg-background/50 border-primary/10 focus:ring-primary/20"
                />
                {l.url && (
                  <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-primary" />
                    </a>
                  </Button>
                )}
              </div>
              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={saveAll} disabled={saving} className="bg-gold hover:bg-gold/90 text-gold-foreground shadow-lg shadow-gold/20 px-12 py-6 text-lg font-bold transition-all hover:scale-105 active:scale-95">
          {saving ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Save className="w-5 h-5 mr-3" />}
          Uložiť všetky nastavenia hodín
        </Button>
      </div>
    </div>
  );
}

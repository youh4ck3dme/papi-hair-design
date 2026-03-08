import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "./config";
import type {
    BusinessHourEntry,
    DateOverride,
    OpenStatus,
    NextOpening,
    PublicBusinessInfo,
    QuickLink
} from "@/hooks/useBusinessInfo.types";

function computeOpenStatus(
    tz: string,
    hours: BusinessHourEntry[],
    overrides: DateOverride[]
): OpenStatus {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "monday";
    const timeStr = parts.find((p) => p.type === "hour")?.value + ":" + (parts.find((p) => p.type === "minute")?.value ?? "00");
    const dateStr = now.toLocaleDateString("en-CA", { timeZone: tz });

    const override = overrides.find((o) => o.override_date === dateStr);
    if (override) {
        if (override.mode === "closed") return { is_open: false, mode: "closed" };
        if (override.mode === "on_request") return { is_open: false, mode: "on_request" };
        if (override.start_time && override.end_time && timeStr >= override.start_time && timeStr < override.end_time) return { is_open: true, mode: "open" };
        return { is_open: false, mode: "open" };
    }

    const dayHours = hours.filter((h) => h.day_of_week === weekday);
    for (const h of dayHours) {
        if (h.mode === "closed") continue;
        if (h.mode === "on_request") return { is_open: false, mode: "on_request" };
        if (timeStr >= h.start_time && timeStr < h.end_time) return { is_open: true, mode: "open" };
    }
    return { is_open: false, mode: "open" };
}

function computeNextOpening(tz: string, hours: BusinessHourEntry[], overrides: DateOverride[]): NextOpening | null {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    for (let d = 0; d < 8; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        const dateStr = formatter.format(date).replace(/\//g, "-");
        const weekday = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" }).toLowerCase();
        const override = overrides.find((o) => o.override_date === dateStr);

        let intervals: { start: string; end: string }[] = [];
        if (override?.mode === "open" && override.start_time && override.end_time) {
            intervals = [{ start: override.start_time, end: override.end_time }];
        } else if (!override || override.mode !== "closed") {
            const dayHours = hours.filter((h) => h.day_of_week === weekday && h.mode === "open");
            intervals = dayHours.map((h) => ({ start: h.start_time, end: h.end_time }));
        }

        const timeStr = now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
        for (const iv of intervals) {
            if (d === 0 && timeStr >= iv.end) continue;
            const openTime = d === 0 && timeStr < iv.start ? iv.start : iv.start;
            const [h, m] = openTime.split(":").map(Number);
            const openDate = new Date(date);
            openDate.setHours(h, m, 0, 0);
            if (openDate > now) {
                return {
                    date: dateStr,
                    time: openTime,
                    datetime: openDate.toISOString(),
                };
            }
        }
    }
    return null;
}

export function useBusinessInfoFirebase(businessId: string) {
    const [info, setInfo] = useState<PublicBusinessInfo | null>(null);
    const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null);
    const [nextOpening, setNextOpening] = useState<NextOpening | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) return;

        const load = async () => {
            setLoading(true);
            try {
                // Public pages can read booking metadata when rules require authenticated users.
                if (!auth.currentUser) {
                    try {
                        await signInAnonymously(auth);
                    } catch (authError) {
                        console.warn("useBusinessInfoFirebase: anonymous sign-in failed", authError);
                    }
                }

                // In Firestore, we use parallel queries
                const [bizSnap, hoursSnap, overridesSnap, linksSnap, servicesSnap] = await Promise.all([
                    getDoc(doc(db, "businesses", businessId)),
                    getDocs(query(collection(db, "business_hours"), where("business_id", "==", businessId))),
                    getDocs(query(collection(db, "business_date_overrides"), where("business_id", "==", businessId))),
                    getDocs(query(collection(db, "business_quick_links"), where("business_id", "==", businessId))),
                    getDocs(query(collection(db, "services"), where("business_id", "==", businessId), where("is_active", "==", true))),
                ]);

                if (!bizSnap.exists()) {
                    console.error("useBusinessInfoFirebase: Business not found", businessId);
                    setLoading(false);
                    return;
                }

                const biz = bizSnap.data();
                const hours: BusinessHourEntry[] = hoursSnap.docs
                    .map(doc => {
                        const d = doc.data();
                        return {
                            day_of_week: d.day_of_week,
                            mode: d.mode,
                            start_time: d.start_time,
                            end_time: d.end_time,
                            sort_order: d.sort_order ?? 0,
                        };
                    })
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

                const overrides: DateOverride[] = overridesSnap.docs.map(doc => {
                    const d = doc.data();
                    return {
                        override_date: d.override_date,
                        mode: d.mode,
                        start_time: d.start_time ?? null,
                        end_time: d.end_time ?? null,
                        label: d.label ?? null,
                    };
                });

                const quick_links: QuickLink[] = linksSnap.docs
                    .map(doc => {
                        const d = doc.data();
                        return {
                            id: doc.id,
                            label: d.label,
                            url: d.url,
                            sort_order: d.sort_order ?? 0,
                        };
                    })
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

                const services = servicesSnap.docs
                    .map(doc => {
                        const d = doc.data();
                        return {
                            id: doc.id,
                            name_sk: d.name_sk ?? "",
                            price: typeof d.price === "number" ? d.price : null,
                            sort_order: d.sort_order ?? 999,
                        };
                    })
                    .sort((a, b) => a.sort_order - b.sort_order);

                const tz = biz.timezone || "Europe/Bratislava";
                setInfo({
                    business: {
                        id: businessId,
                        name: biz.name,
                        slug: biz.slug ?? null,
                        address: biz.address ?? null,
                        phone: biz.phone ?? null,
                        email: biz.email ?? null,
                        timezone: tz,
                        logo_url: biz.logo_url ?? null,
                        lead_time_minutes: biz.lead_time_minutes ?? 0,
                        max_days_ahead: biz.max_days_ahead ?? 365,
                        cancellation_hours: biz.cancellation_hours ?? 24,
                        allow_admin_as_provider: biz.allow_admin_as_provider ?? false,
                        opening_hours: biz.opening_hours ?? {},
                    },
                    hours,
                    services,
                    overrides,
                    quick_links,
                });
                setOpenStatus(computeOpenStatus(tz, hours, overrides));
                setNextOpening(computeNextOpening(tz, hours, overrides));
            } catch (err) {
                console.error("useBusinessInfoFirebase: Unexpected error", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [businessId]);

    return { info, openStatus, nextOpening, loading };
}

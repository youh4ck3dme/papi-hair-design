import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "./config";
import { ServiceRow, EmployeeRow, MembershipRow } from "@/components/booking/types";
import { type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";

const FALLBACK_BIZ = "papi-hair-design-main";

export interface BusinessData {
    id: string;
    name: string;
    allow_admin_as_provider?: boolean;
    max_days_ahead?: number;
    lead_time_minutes?: number;
    opening_hours?: unknown;
    revision?: number;
}

export function useBookingDataFirebase() {
    const [services, setServices] = useState<ServiceRow[]>([]);
    const [employees, setEmployees] = useState<EmployeeRow[]>([]);
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [businessHourEntries, setBusinessHourEntries] = useState<BusinessHourEntry[]>([]);
    const [dateOverrides, setDateOverrides] = useState<DateOverrideEntry[]>([]);
    const [schedules, setSchedules] = useState<Record<string, any[]>>({});
    const [employeeServiceMap, setEmployeeServiceMap] = useState<Record<string, string[]>>({});
    const [memberships, setMemberships] = useState<MembershipRow[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setInitialLoading(true);
            try {
                // Public booking needs read access even when Firebase rules require authentication.
                if (!auth.currentUser) {
                    try {
                        await signInAnonymously(auth);
                    } catch (authError) {
                        console.warn("useBookingDataFirebase: anonymous sign-in failed", authError);
                    }
                }

                // 1. Try snapshot first
                const snapshotDoc = await getDoc(doc(db, "public_snapshots", FALLBACK_BIZ));

                if (snapshotDoc.exists()) {
                    const snap = snapshotDoc.data() as any;
                    setBusiness({
                        id: FALLBACK_BIZ,
                        name: snap.business?.name ?? "",
                        allow_admin_as_provider: snap.business?.allow_admin_as_provider,
                        max_days_ahead: snap.business?.max_days_ahead,
                        lead_time_minutes: snap.business?.lead_time_minutes,
                        opening_hours: snap.business?.opening_hours,
                        revision: snap.revision,
                    });
                    setServices(
                        (snap.services ?? [])
                            .map((d: any) => ({ id: d.id, ...d } as ServiceRow))
                            .sort((a: any, b: any) => {
                                const aSort = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
                                const bSort = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
                                if (aSort !== bSort) return aSort - bSort;
                                return (a.name_sk ?? "").localeCompare(b.name_sk ?? "", "sk");
                            })
                    );
                    setEmployees(
                        (snap.employees ?? [])
                            .map((d: any) => ({ id: d.id, ...d } as EmployeeRow))
                            .sort((a: any, b: any) => (a.display_name ?? "").localeCompare(b.display_name ?? "", "sk"))
                    );
                    setBusinessHourEntries(
                        (snap.business_hours ?? [])
                            .map((h: any) => ({
                                day_of_week: h.day_of_week,
                                mode: h.mode,
                                start_time: h.start_time,
                                end_time: h.end_time,
                                sort_order: h.sort_order ?? Number.MAX_SAFE_INTEGER,
                            }))
                            .sort((a: any, b: any) => a.sort_order - b.sort_order)
                            .map(({ day_of_week, mode, start_time, end_time }: any) => ({ day_of_week, mode, start_time, end_time }))
                    );
                    setDateOverrides(
                        (snap.date_overrides ?? []).map((o: any) => ({
                            override_date: o.override_date,
                            mode: o.mode,
                            start_time: o.start_time ?? null,
                            end_time: o.end_time ?? null
                        }))
                    );
                    setEmployeeServiceMap(snap.employee_service_map ?? {});
                } else {
                    // Fallback to live collections
                    const [bizSnap, svcSnap, empSnap, bhSnap, bdoSnap] = await Promise.all([
                        getDoc(doc(db, "businesses", FALLBACK_BIZ)),
                        getDocs(query(
                            collection(db, "services"),
                            where("business_id", "==", FALLBACK_BIZ),
                            where("is_active", "==", true)
                        )),
                        getDocs(query(
                            collection(db, "employees"),
                            where("business_id", "==", FALLBACK_BIZ),
                            where("is_active", "==", true)
                        )),
                        getDocs(query(
                            collection(db, "business_hours"),
                            where("business_id", "==", FALLBACK_BIZ)
                        )),
                        getDocs(query(
                            collection(db, "business_date_overrides"),
                            where("business_id", "==", FALLBACK_BIZ),
                            where("override_date", ">=", new Date().toISOString().slice(0, 10))
                        )),
                    ]);

                    if (bizSnap.exists()) {
                        const d = bizSnap.data();
                        setBusiness({
                            id: FALLBACK_BIZ,
                            name: d.name,
                            allow_admin_as_provider: d.allow_admin_as_provider,
                            max_days_ahead: d.max_days_ahead,
                            lead_time_minutes: d.lead_time_minutes,
                            opening_hours: d.opening_hours
                        });
                    }

                    setServices(
                        svcSnap.docs
                            .map(d => ({ id: d.id, ...d.data() } as ServiceRow))
                            .sort((a, b) => {
                                const aSort = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
                                const bSort = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
                                if (aSort !== bSort) return aSort - bSort;
                                return (a.name_sk ?? "").localeCompare(b.name_sk ?? "", "sk");
                            })
                    );
                    setEmployees(
                        empSnap.docs
                            .map(d => ({ id: d.id, ...d.data() } as EmployeeRow))
                            .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? "", "sk"))
                    );

                    setBusinessHourEntries(
                        bhSnap.docs
                            .map(d => {
                                const h = d.data();
                                return {
                                    day_of_week: h.day_of_week,
                                    mode: h.mode,
                                    start_time: h.start_time,
                                    end_time: h.end_time,
                                    sort_order: h.sort_order ?? Number.MAX_SAFE_INTEGER,
                                };
                            })
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map(({ day_of_week, mode, start_time, end_time }) => ({ day_of_week, mode, start_time, end_time }))
                    );

                    setDateOverrides(bdoSnap.docs.map(d => {
                        const o = d.data();
                        return {
                            override_date: o.override_date,
                            mode: o.mode,
                            start_time: o.start_time ?? null,
                            end_time: o.end_time ?? null
                        };
                    }));
                }

                // 2. Memberships (best-effort)
                try {
                    const memSnap = await getDocs(query(
                        collection(db, "memberships"),
                        where("business_id", "==", FALLBACK_BIZ)
                    ));
                    setMemberships(memSnap.docs.map(d => {
                        const data = d.data();
                        return { profile_id: data.profile_id, role: data.role };
                    }) as MembershipRow[]);
                } catch (membershipError) {
                    console.warn("useBookingDataFirebase: memberships unavailable for current user", membershipError);
                    setMemberships([]);
                }

            } catch (error_) {
                console.warn("useBookingDataFirebase: failed to load Firestore data", error_);
            } finally {
                setInitialLoading(false);
            }
        };
        load();
    }, []);

    return {
        services,
        employees,
        business,
        businessHourEntries,
        dateOverrides,
        schedules,
        employeeServiceMap,
        memberships,
        initialLoading
    };
}
